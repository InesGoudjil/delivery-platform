import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerServices } from '@/core/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const redirectParam = searchParams.get('redirect');
  const inviteToken = searchParams.get('invite_token');
  const waitlistToken = searchParams.get('waitlist_token');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      let targetPath = redirectParam || next;
      try {
        const services = await getServerServices();

        // 1. Claim waitlist invite if present
        if (waitlistToken) {
          try {
            await services.waitlist.claimInvite(waitlistToken);
          } catch (e) {
            console.warn('Could not claim waitlist token in OAuth callback:', e);
          }
        }

        const fullName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'Creator';

        const avatarUrl =
          data.user.user_metadata?.avatar_url ||
          data.user.user_metadata?.picture ||
          null;

        const clientIp =
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          undefined;

        // 2. Sync OAuth user profile (name, avatar, last login)
        await services.profile.syncOAuthProfile(data.user.id, {
          fullName,
          avatarUrl,
          ip: clientIp,
        }).catch((err) => {
          console.warn('Could not sync OAuth profile in callback:', err);
        });

        // 3. Route to workspace or invite token
        if (inviteToken) {
          targetPath = `/invite/${inviteToken}`;
        } else {
          // Check if user already belongs to an existing workspace (owner or member)
          const userWorkspaces = await services.workspace.getUserWorkspaces(data.user.id).catch(() => []);
          let workspace = userWorkspaces[0];
          if (!workspace) {
            workspace = await services.workspace.getOrCreateWorkspace(data.user.id, fullName);
          }
          if ((targetPath === '/' || !targetPath) && workspace?.slug) {
            targetPath = `/${workspace.slug}`;
          }
        }
      } catch (err) {
        console.error('Workspace setup error in OAuth callback:', err);
      }

      // 4. Sanitize targetPath to avoid open redirect vulnerabilities
      if (!targetPath.startsWith('/') || targetPath.startsWith('//') || targetPath.includes('\\')) {
        targetPath = '/';
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

  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');
  let errorMsg = errorDesc || errorParam || 'auth-callback-failed';
  if (errorParam === 'access_denied') {
    errorMsg = 'Google sign-in was cancelled or access was denied.';
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`);
}
