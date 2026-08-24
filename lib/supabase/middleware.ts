import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createCoreServices } from '@/core/container';

/**
 * Next.js Edge Middleware
 * Handles session token refresh, authentication redirects, and role-based access control.
 * Injects domain business logic services via createCoreServices.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
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

  // 1. Initialize Core Domain Services with the request-scoped Supabase client
  const { services } = createCoreServices(supabase as any);

  // 2. Fetch User, Profile (holding platform_role), and Primary Workspace
  let userSession;
  try {
    userSession = await services.auth.getCurrentSessionData();
  } catch (err) {
    userSession = { user: null, profile: null, workspace: null };
  }

  const { user, profile, workspace } = userSession;
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 3. AUTH PAGES: If already logged in, redirect away from /login and /signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    url.pathname = workspace?.slug ? `/${workspace.slug}/deliveries` : '/';
    return NextResponse.redirect(url);
  }

  // 4. ADMIN ROUTE GUARD (/admin, /admin/*)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectParam = encodeURIComponent(pathname);
      url.pathname = `/login`;
      url.search = `redirect=${redirectParam}`;
      return NextResponse.redirect(url);
    }

    // Check platform role from user_profiles table as well as auth metadata
    const isAdmin =
      profile?.platformRole === 'admin' ||
      user.user_metadata?.platform_role === 'admin' ||
      user.user_metadata?.is_admin === true;

    if (!isAdmin) {
      // Non-admins are redirected back to their creator workspace
      url.pathname = workspace?.slug ? `/${workspace.slug}/deliveries` : '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // 5. WORKSPACE ROUTE GUARD (/[workspaceSlug]/[section])
  const workspacePattern =
    /^\/([^/]+)\/(deliveries|portfolio|settings|storage|billing|members|notifications|security|projects|docs|help)/;
  const workspaceMatch = pathname.match(workspacePattern);

  if (workspaceMatch) {
    if (!user) {
      const redirectParam = encodeURIComponent(pathname);
      url.pathname = `/login`;
      url.search = `redirect=${redirectParam}`;
      return NextResponse.redirect(url);
    }

    const targetSlug = workspaceMatch[1];

    // If target slug is the user's primary workspace, allow immediate access
    if (workspace && workspace.slug === targetSlug) {
      return supabaseResponse;
    }

    // Otherwise verify membership in target workspace
    try {
      const targetWorkspace = await services.workspace.getWorkspaceBySlug(targetSlug);
      if (!targetWorkspace) {
        url.pathname = workspace?.slug ? `/${workspace.slug}/deliveries` : '/';
        url.search = '';
        return NextResponse.redirect(url);
      }

      // Check if user is owner or member
      if (targetWorkspace.ownerId !== user.id) {
        const isMember = await services.member.isMember(targetWorkspace.id, user.id);
        if (!isMember) {
          url.pathname = workspace?.slug ? `/${workspace.slug}/deliveries` : '/';
          url.search = '';
          return NextResponse.redirect(url);
        }
      }
    } catch {
      url.pathname = workspace?.slug ? `/${workspace.slug}/deliveries` : '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // 6. ROOT / DASHBOARD REDIRECT (/ or /dashboard)
  if (pathname === '/' || pathname === '/dashboard') {
    if (user && workspace?.slug) {
      url.pathname = `/${workspace.slug}/deliveries`;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
