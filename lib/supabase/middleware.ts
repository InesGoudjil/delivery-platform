import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { SupabaseUserSessionRepository } from '@/core/repositories/user-session.repository';
import type { UserSession } from '@/core/entities/user-session';
import {
  SessionService,
  sessionIdentityFromClaims,
  type SessionIdentity,
} from '@/core/services/session.service';
import { LEGACY_SESSION_COOKIE_NAME, trackUserSession } from '@/lib/session-manager';

export const SESSION_REVOKED_MESSAGE = 'This device was signed out of your account. Please sign in again.';
export const SESSION_UNVERIFIED_MESSAGE = 'Your session could not be verified. Please sign in again.';

interface PendingCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

type SessionStatus = 'active' | 'revoked' | 'unknown';

/** Supabase's auth cookie name (supabase-js derives it from the project URL), chunks are `<key>.N`. */
function authCookieKey(supabaseUrl: string): string | null {
  try {
    return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function serviceRoleClient(supabaseUrl: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || key === 'your-supabase-service-role-key') return null;
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Next.js Middleware: refreshes the Supabase session, enforces device sign-outs, and guards routes.
 * Edge-runtime safe: no Node.js APIs and no DI container.
 *
 * Every request with a signed-in user is checked against its device row in user_sessions, keyed
 * on the access token's session_id claim (not on a cookie the browser could drop). A revoked row
 * signs this device out and sends it to /login; a login without a row gets one.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard against missing environment variables in Vercel Preview environments
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  const requestCookieNames = request.cookies.getAll().map(({ name }) => name);

  // Cookies and headers Supabase asks for (refreshed or cleared auth tokens, no-cache headers),
  // applied to whichever response this returns, redirects included.
  const pendingCookies = new Map<string, PendingCookie>();
  const pendingHeaders = new Map<string, string>();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          // Server Components rendering this request see the new tokens.
          if (cookie.value) request.cookies.set(cookie.name, cookie.value);
          else request.cookies.delete(cookie.name);
          pendingCookies.set(cookie.name, cookie);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          pendingHeaders.set(key, value);
        }
      },
    },
  });

  const respond = (response: NextResponse): NextResponse => {
    for (const { name, value, options } of pendingCookies.values()) {
      response.cookies.set(name, value, options);
    }
    for (const [key, value] of pendingHeaders) {
      response.headers.set(key, value);
    }
    if (requestCookieNames.includes(LEGACY_SESSION_COOKIE_NAME)) {
      response.cookies.set(LEGACY_SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    }
    return response;
  };

  const redirectTo = (pathname: string, search = ''): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return respond(NextResponse.redirect(url));
  };

  /** Signs this device out (other devices stay signed in) and sends it to /login. */
  const signOutAndRedirect = async (message: string): Promise<NextResponse> => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) console.warn('[middleware] Supabase sign-out returned an error:', error.message);
    } catch (err) {
      console.warn('[middleware] Supabase sign-out failed:', messageOf(err));
    }

    const response = redirectTo('/login', `error=${encodeURIComponent(message)}`);

    // signOut() clears the auth cookies through setAll, and respond() copied them onto the
    // redirect. If it didn't get that far, expire every auth cookie the request carried.
    const key = authCookieKey(supabaseUrl);
    for (const name of requestCookieNames) {
      const isAuthCookie = key ? name.startsWith(key) : /^sb-.+-auth-token/.test(name);
      if (isAuthCookie && pendingCookies.get(name)?.value !== '') {
        response.cookies.set(name, '', { path: '/', sameSite: 'lax', maxAge: 0 });
      }
    }
    return response;
  };

  /** Records a login seen without a row, with the service role (users can't write the table). */
  const registerSession = async (identity: SessionIdentity): Promise<SessionStatus> => {
    const admin = serviceRoleClient(supabaseUrl);
    if (!admin) return 'active'; // without a service key, the sign-in paths can't record it either
    try {
      const sessions = new SessionService(new SupabaseUserSessionRepository(admin));
      const stored = await trackUserSession(sessions, identity, request.headers);
      // Revoked between the lookup and the insert: the insert never un-revokes.
      return stored?.isRevoked ? 'revoked' : 'active';
    } catch (err) {
      console.warn('[middleware] Could not record the session:', messageOf(err));
      return 'active';
    }
  };

  const checkSession = async (identity: SessionIdentity): Promise<SessionStatus> => {
    let row: UserSession | null;
    try {
      // The user's own client: row-level security shows users their own rows, revoked ones included.
      row = await new SupabaseUserSessionRepository(supabase).findByTokenId(identity.userId, identity.sessionId);
    } catch (err) {
      // Not a sign-out: a database hiccup mustn't end sessions. Server-side getUser() still
      // rejects logins whose Supabase session was ended.
      console.error('[middleware] Could not check whether the session was revoked:', messageOf(err));
      return 'unknown';
    }
    if (!row) return registerSession(identity);
    return row.isRevoked ? 'revoked' : 'active';
  };

  // 1. Who is signed in. getClaims() verifies the access token, refreshing it first when it is
  //    about to expire.
  let claims: unknown = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error) claims = data?.claims ?? null;
  } catch (err) {
    console.warn('[middleware] Could not verify the session:', messageOf(err));
  }

  let user: { id: string } | null = null;
  if (claims) {
    const identity = sessionIdentityFromClaims(claims);
    if (!identity) {
      // Every login token Supabase Auth issues names its user and session; without them the
      // login can't be checked against its device row, or revoked.
      return signOutAndRedirect(SESSION_UNVERIFIED_MESSAGE);
    }

    // 1.5 Device sign-out enforcement
    if ((await checkSession(identity)) === 'revoked') {
      return signOutAndRedirect(SESSION_REVOKED_MESSAGE);
    }
    user = { id: identity.userId };
  }

  const pathname = request.nextUrl.pathname;

  // 2. AUTH PAGES: If already logged in, redirect away from /login and /signup to home
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return redirectTo('/', request.nextUrl.search);
  }

  // 3. ADMIN ROUTE GUARD (/admin, /admin/*)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return redirectTo('/login', `redirect=${encodeURIComponent(pathname)}`);
    }

    // Query actual user_profiles row in database instead of client user_metadata
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single();

    if (profile?.platform_role !== 'admin') {
      return redirectTo('/', '');
    }
  }

  // 4. WORKSPACE ROUTE GUARD (/[workspaceSlug]/[section])
  const workspacePattern =
    /^\/([^/]+)\/(deliveries|portfolio|settings|storage|billing|members|notifications|security|projects|docs|help)/;

  if (!user && workspacePattern.test(pathname)) {
    return redirectTo('/login', `redirect=${encodeURIComponent(pathname)}`);
  }

  // Authenticated users can view the home page ("/") freely without being forced to redirect
  return respond(NextResponse.next({ request }));
}
