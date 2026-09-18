import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const isWaitlistOnly =
    process.env.WAITLIST_ONLY === 'true' ||
    process.env.NEXT_PUBLIC_WAITLIST_ONLY === 'true';

  if (isWaitlistOnly) {
    const { pathname } = request.nextUrl;
    const bypassSecret = process.env.WAITLIST_BYPASS_SECRET;
    const previewParam =
      request.nextUrl.searchParams.get('preview') ||
      request.nextUrl.searchParams.get('bypass');
    const bypassCookie = request.cookies.get('waitlist_bypass')?.value;

    // Support clearing the bypass cookie to test waitlist view again
    if (previewParam === 'clear') {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete('preview');
      cleanUrl.searchParams.delete('bypass');
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.delete('waitlist_bypass');
      return response;
    }

    // Check if team member is unlocking preview via secret query param (?preview=SECRET or ?bypass=SECRET)
    if (bypassSecret && previewParam === bypassSecret) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete('preview');
      cleanUrl.searchParams.delete('bypass');
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set('waitlist_bypass', bypassSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      return response;
    }

    // Check if user has valid bypass cookie
    const isBypassed = Boolean(bypassSecret && bypassCookie === bypassSecret);

    if (!isBypassed) {
      // Allow internal Next.js paths, API routes, and favicon
      if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/favicon.ico'
      ) {
        return await updateSession(request);
      }

      // If user is already on the waitlist page, allow request through
      if (pathname === '/waitlist') {
        return await updateSession(request);
      }

      // Redirect any other route (root '/', '/login', '/signup', '/admin', workspaces) to /waitlist
      const url = request.nextUrl.clone();
      url.pathname = '/waitlist';
      return NextResponse.redirect(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - images, media, and font assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|mp4|webm)$).*)',
  ],
};
