import { createClient } from '@/lib/supabase/server';
import { readSessionIdentity } from '@/core/services/session.service';
import { finishSignIn, redirectWithinApp } from '@/core/security/finish-sign-in';
import { safeReturnPath } from '@/lib/security/return-path';
import { createScopedLogger } from '@/lib/logger';

const log = createScopedLogger({ route: 'api/auth/callback' });

/**
 * Google sign-in (and the old PKCE email links) land here with a `code`. Email links sent with
 * the token_hash templates go to /api/auth/confirm instead.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      const meta = data.user.user_metadata ?? {};
      const fullName = meta.full_name || meta.name || data.user.email?.split('@')[0] || 'Creator';
      const avatarUrl = meta.avatar_url || meta.picture || null;

      let target = '/';
      try {
        ({ redirectTo: target } = await finishSignIn({
          user: data.user,
          identity: await readSessionIdentity(supabase.auth),
          headers: request.headers,
          requestedPath: safeReturnPath(searchParams.get('redirect') || searchParams.get('next'), '/'),
          inviteToken: searchParams.get('invite_token'),
          waitlistToken: searchParams.get('waitlist_token'),
          oauthProfile: { fullName, avatarUrl },
          // Set by the sign-up page's Google button once its terms box is ticked.
          acceptedTermsVersion: searchParams.get('terms'),
        }));
      } catch (err) {
        log.error({ err }, 'Could not finish the sign-in in the OAuth callback');
      }
      return redirectWithinApp(request, target);
    }
  }

  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');
  let errorMsg = errorDesc || errorParam || 'auth-callback-failed';
  if (errorParam === 'access_denied') {
    errorMsg = 'Google sign-in was cancelled or access was denied.';
  }

  return redirectWithinApp(request, `/login?error=${encodeURIComponent(errorMsg)}`);
}
