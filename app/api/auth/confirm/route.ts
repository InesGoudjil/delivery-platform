import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { readSessionIdentity } from '@/core/services/session.service';
import { finishSignIn, redirectWithinApp } from '@/core/security/finish-sign-in';
import { safeReturnPath } from '@/lib/security/return-path';
import { createScopedLogger } from '@/lib/logger';

const log = createScopedLogger({ route: 'api/auth/confirm' });

/** The link types Supabase Auth's email templates can send here. */
const EMAIL_LINK_TYPES = ['email', 'signup', 'recovery', 'email_change', 'invite', 'magiclink'] as const;

// Not exported: route files may only export route handlers and route config.
const EMAIL_LINK_FAILED_MESSAGE = 'This link has expired or was already used. Sign in, or ask for a new link.';

function isEmailLinkType(value: string | null): value is EmailOtpType {
  return EMAIL_LINK_TYPES.includes(value as (typeof EMAIL_LINK_TYPES)[number]);
}

/**
 * Email links from Supabase Auth: the sign-up confirmation and the password reset. The templates
 * in emails/supabase link here with `token_hash` instead of Supabase's own `{{ .ConfirmationURL }}`.
 * That way the link works on any device: a PKCE code only works in the browser that asked for it.
 *
 * Where the link goes next:
 * - A reset goes to /reset-password.
 * - A sign-up confirmation goes to the page the person signed up from (an invite link, say),
 *   which signupAction keeps in the user's metadata as `signup_redirect`.
 * - Anything else goes to `next`, a same-site path.
 * - Users with two-factor sign-in enter their code on /mfa first.
 *
 * The templates don't use `{{ .RedirectTo }}`: Supabase inserts template values unescaped, so a
 * crafted redirect could put HTML into a real CineSpace email.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (!tokenHash || !isEmailLinkType(type)) {
    return redirectWithinApp(request, `/login?error=${encodeURIComponent(EMAIL_LINK_FAILED_MESSAGE)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  // An email change needs both addresses confirmed ("Secure email change"). After the first link
  // Supabase answers with a message and no session; after the second it signs the user in.
  if (type === 'email_change') {
    if (error) {
      log.info({ type, reason: error.message }, 'Email link refused');
      return redirectWithinApp(request, `/login?error=${encodeURIComponent(EMAIL_LINK_FAILED_MESSAGE)}`);
    }
    return redirectWithinApp(request, `/email-change?status=${data?.session ? 'done' : 'partial'}`);
  }

  if (error || !data?.user) {
    log.info({ type, reason: error?.message }, 'Email link refused');
    return redirectWithinApp(request, `/login?error=${encodeURIComponent(EMAIL_LINK_FAILED_MESSAGE)}`);
  }

  const fromSignUp =
    type === 'email' || type === 'signup' ? (data.user.user_metadata?.signup_redirect as unknown) : undefined;
  const requestedPath =
    type === 'recovery'
      ? '/reset-password'
      : safeReturnPath(typeof fromSignUp === 'string' ? fromSignUp : url.searchParams.get('next'), '/');

  let target = requestedPath;
  try {
    ({ redirectTo: target } = await finishSignIn({
      user: data.user,
      identity: await readSessionIdentity(supabase.auth),
      headers: request.headers,
      requestedPath,
    }));
  } catch (err) {
    log.error({ err, type }, 'Could not finish the sign-in from an email link');
  }
  return redirectWithinApp(request, target);
}
