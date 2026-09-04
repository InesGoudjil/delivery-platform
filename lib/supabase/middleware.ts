import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware
 * Handles session token refresh, authentication redirects, and route guards.
 * Lightweight & Edge-Runtime compliant (no heavy Node.js DI container imports).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard against missing environment variables in Vercel Preview environments
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Fetch User & refresh auth session cookies safely in Edge Runtime
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 2. AUTH PAGES: If already logged in, redirect away from /login and /signup to home
  if (user && (pathname === '/login' || pathname === '/signup')) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 3. ADMIN ROUTE GUARD (/admin, /admin/*)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectParam = encodeURIComponent(pathname);
      url.pathname = '/login';
      url.search = `redirect=${redirectParam}`;
      return NextResponse.redirect(url);
    }

    const isAdmin =
      user.user_metadata?.platform_role === 'admin' ||
      user.user_metadata?.is_admin === true;

    if (!isAdmin) {
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // 4. WORKSPACE ROUTE GUARD (/[workspaceSlug]/[section])
  const workspacePattern =
    /^\/([^/]+)\/(deliveries|portfolio|settings|storage|billing|members|notifications|security|projects|docs|help)/;
  const workspaceMatch = pathname.match(workspacePattern);

  if (workspaceMatch && !user) {
    const redirectParam = encodeURIComponent(pathname);
    url.pathname = '/login';
    url.search = `redirect=${redirectParam}`;
    return NextResponse.redirect(url);
  }

  // Authenticated users can view the home page ("/") freely without being forced to redirect
  return supabaseResponse;
}
