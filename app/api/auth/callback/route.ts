import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerServices } from '@/core/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      let targetPath = next;
      try {
        const services = await getServerServices();
        const fullName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'Creator';
        const workspace = await services.workspace.getOrCreateWorkspace(data.user.id, fullName);
        if (next === '/' && workspace?.slug) {
          targetPath = `/${workspace.slug}`;
        }
      } catch (err) {
        console.error('Workspace setup error in OAuth callback:', err);
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${targetPath}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${targetPath}`);
      } else {
        return NextResponse.redirect(`${origin}${targetPath}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
