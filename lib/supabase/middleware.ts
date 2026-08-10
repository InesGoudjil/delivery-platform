import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  if (user && (url.pathname === '/login' || url.pathname === '/signup')) {
    const { data: workspace } = await (supabase as any)
      .from('workspaces')
      .select('slug')
      .eq('owner_id', user.id)
      .maybeSingle();

    url.pathname = workspace?.slug ? `/${workspace.slug}` : '/';
    return NextResponse.redirect(url);
  }

  const workspacePattern = /^\/([^/]+)\/(projects|settings|portfolio)/;
  const workspaceMatch = url.pathname.match(workspacePattern);

  if (workspaceMatch) {
    if (!user) {
      const redirectParam = encodeURIComponent(url.pathname);
      url.pathname = `/login?redirect=${redirectParam}`;
      url.search = '';
      return NextResponse.redirect(url);
    }

    const slug = workspaceMatch[1];
    const { data: workspace } = await (supabase as any)
      .from('workspaces')
      .select('id, owner_id')
      .eq('slug', slug)
      .maybeSingle();

    if (!workspace || workspace.owner_id !== user.id) {
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (url.pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/login';
      url.search = '';
      return NextResponse.redirect(url);
    }

    const isAdmin = user.user_metadata?.is_admin === true;
    if (!isAdmin) {
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (url.pathname === '/' || url.pathname === '/dashboard') {
    if (user) {
      const { data: workspace } = await (supabase as any)
        .from('workspaces')
        .select('slug')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (workspace?.slug) {
        url.pathname = `/${workspace.slug}`;
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
