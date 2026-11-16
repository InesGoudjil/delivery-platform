'use server';

import { redirect } from 'next/navigation';
import { getServerAdminServices, getServerServices } from '@/core/server';
import { changeEmailSchema, setPasswordSchema } from '@/lib/validations/auth';
import { safeReturnPath } from '@/lib/security/return-path';
import { TERMS_VERSION } from '@/lib/legal/terms';
import { RATELIMIT_POLICIES } from '@/lib/upstash';
import { authErrorMessage, rateLimitRefusal, requestOrigin } from '@/lib/auth/form-helpers';
import { createScopedLogger } from '@/lib/logger';

/**
 * The signed-in user's own account: email address, password and terms acceptance. The Security
 * page uses the first three; /accept-terms uses the last one.
 */

const log = createScopedLogger({ actionGroup: 'account' });

export interface AccountState {
  error?: string | null;
  success?: string | null;
}

export interface AccountCredentials {
  email: string | null;
  /** The address an email change is waiting to confirm, if any. */
  pendingEmail: string | null;
  /** False for Google-only accounts: the Security page offers "Set a password" instead. */
  hasPassword: boolean;
}

export async function getAccountCredentialsAction(): Promise<
  { success: true; data: AccountCredentials } | { success: false; error: string }
> {
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();
  if (!user) return { success: false, error: 'You must be signed in.' };

  // Before the account-settings migration is applied, assume a password, as the page always did.
  let hasPassword = true;
  try {
    hasPassword = await (await getServerAdminServices()).profile.hasPassword(user.id);
  } catch (err) {
    log.warn({ err, userId: user.id }, 'Could not read the password status');
  }

  return {
    success: true,
    data: { email: user.email ?? null, pendingEmail: user.new_email ?? null, hasPassword },
  };
}

/** Adds a password to an account that has none yet (it signed up with Google). */
export async function setPasswordAction(prevState: AccountState | null, formData: FormData): Promise<AccountState> {
  const parsed = setPasswordSchema.safeParse({
    newPassword: formData.get('new-password'),
    confirmPassword: formData.get('confirm-password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please check your password.' };
  }

  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: 'You must be signed in to set a password.' };

    const refusal = await rateLimitRefusal(RATELIMIT_POLICIES.passwordChange, [user.id]);
    if (refusal) return { error: refusal };

    // Only for accounts without a password: anyone else must give their current one.
    if (await (await getServerAdminServices()).profile.hasPassword(user.id)) {
      return { error: 'Your account already has a password. Change it with your current password.' };
    }

    const { error } = await services.auth.updateUserPassword(parsed.data.newPassword);
    if (error) return { error: authErrorMessage(error) };

    // As with a password change: every other login ends, this one stays.
    try {
      const current = await services.auth.getSessionIdentity();
      if (current && current.userId === user.id) await services.session.revokeAllOtherSessions(current);
      const { error: othersError } = await services.auth.signOutOthers();
      if (othersError) throw othersError;
    } catch (err) {
      log.warn({ err }, 'Password set, but signing out other devices failed');
    }

    return { success: 'Password set. You can now also sign in with your email address and this password.' };
  } catch (err) {
    log.error({ err }, 'Setting a password failed');
    return { error: 'Failed to set the password. Please try again.' };
  }
}

/**
 * Starts an email change. Supabase sends a confirmation link to the new address and, with
 * "Secure email change" on, one to the current address too. The change happens once they're opened
 * (/api/auth/confirm, then /email-change).
 */
export async function changeEmailAction(prevState: AccountState | null, formData: FormData): Promise<AccountState> {
  const parsed = changeEmailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please enter a valid email address.' };
  }
  const newEmail = parsed.data.email;

  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: 'You must be signed in to change your email address.' };
    if (user.email && user.email.toLowerCase() === newEmail.toLowerCase()) {
      return { error: "That's already your email address." };
    }

    const refusal = await rateLimitRefusal(RATELIMIT_POLICIES.emailChange, [user.id]);
    if (refusal) return { error: refusal };

    // Only Supabase's own link (`{{ .ConfirmationURL }}`) uses this; the token_hash template
    // links to /api/auth/confirm.
    const { error } = await services.auth.requestEmailChange(newEmail, `${await requestOrigin()}/api/auth/callback`);
    if (error) return { error: authErrorMessage(error) };

    return {
      success: `We sent confirmation links to ${newEmail} and to your current address. Open both to finish the change.`,
    };
  } catch (err) {
    log.error({ err }, 'Starting an email change failed');
    return { error: 'Failed to start the email change. Please try again.' };
  }
}

/** /accept-terms: records that the signed-in user accepts the current Terms, then moves on. */
export async function acceptTermsAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnPath(formData.get('redirect') as string | null, '/');

  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/accept-terms?redirect=${encodeURIComponent(returnTo)}`)}`);

  if (formData.get('accept_terms') !== 'on') {
    redirect(`/accept-terms?redirect=${encodeURIComponent(returnTo)}&error=required`);
  }

  // Users can't write these columns themselves (trigger); the server records them.
  await (await getServerAdminServices()).profile.recordTermsAcceptance(user.id, TERMS_VERSION);

  if (returnTo !== '/') redirect(returnTo);
  const [workspace] = await services.workspace.getUserWorkspaces(user.id).catch(() => []);
  redirect(workspace ? `/${workspace.slug}` : '/');
}
