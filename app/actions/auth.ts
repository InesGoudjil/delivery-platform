'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getServerAdminServices, getServerServices } from '@/core/server';
import type { Workspace } from '@/core/entities/workspace';
import { finishSignIn } from '@/core/security/finish-sign-in';
import { sendServerEvent } from '@/lib/meta';
import { captureSignup, captureLogin } from '@/lib/posthog';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/lib/validations/auth';
import { signOutCurrentSession, trackUserSession } from '@/lib/session-manager';
import { safeReturnPath } from '@/lib/security/return-path';
import { TERMS_VERSION } from '@/lib/legal/terms';
import { getClientIp, RATELIMIT_POLICIES } from '@/lib/upstash';
import {
  authErrorCode,
  authErrorMessage,
  captchaTokenFrom,
  rateLimitRefusal,
  requestOrigin,
} from '@/lib/auth/form-helpers';
import { createScopedLogger } from '@/lib/logger';

const log = createScopedLogger({ actionGroup: 'auth' });

export interface AuthState {
  error?: string | null;
  success?: string | null;
}

/** Shown when the sign-up form's terms checkbox wasn't ticked. */
const TERMS_REQUIRED_MESSAGE = 'Please accept the Terms of Service and Privacy Policy to create your account.';

export async function requestPasswordResetAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string;

  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please enter a valid email address.' };
  }

  // Per visitor, and per address, so nobody can flood someone's inbox with reset emails.
  const refusal =
    (await rateLimitRefusal(RATELIMIT_POLICIES.passwordReset, ['ip', await getClientIp()])) ??
    (await rateLimitRefusal(RATELIMIT_POLICIES.passwordReset, ['email', parsed.data.email.toLowerCase()]));
  if (refusal) return { error: refusal };

  try {
    const services = await getServerServices();
    // Only the old `{{ .ConfirmationURL }}` template uses this. The token_hash template links to
    // /api/auth/confirm, which sends resets to /reset-password.
    const redirectTo = `${await requestOrigin()}/api/auth/callback?next=/reset-password`;

    const { error } = await services.auth.resetPasswordForEmail(parsed.data.email, redirectTo, captchaTokenFrom(formData));
    if (error) {
      return { error: authErrorMessage(error) };
    }

    return {
      success: 'Password reset instructions have been sent to your email. Please check your inbox.',
    };
  } catch (err: any) {
    return {
      error: err?.message || 'Failed to send reset link. Please try again later.',
    };
  }
}

export async function resetPasswordAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please fill in all required fields.' };
  }

  try {
    const services = await getServerServices();
    const { error } = await services.auth.updateUserPassword(password);

    if (error) {
      return { error: error.message };
    }

    // People reset a password when it's lost or stolen, so end every other login, as a password
    // change does. This device stays signed in.
    try {
      const current = await services.auth.getSessionIdentity();
      if (current) {
        await trackUserSession(services.session, current, await headers());
        await services.session.revokeAllOtherSessions(current);
      }
      const { error: othersError } = await services.auth.signOutOthers();
      if (othersError) throw othersError;
    } catch (sessionErr) {
      log.warn({ err: sessionErr }, 'Password reset, but signing out other devices failed');
    }

    const user = await services.auth.getCurrentUser();
    let workspaceSlug = 'studio';
    if (user) {
      const userWorkspaces = await services.workspace.getUserWorkspaces(user.id);
      if (userWorkspaces.length > 0) {
        workspaceSlug = userWorkspaces[0].slug;
      }
    }

    revalidatePath('/', 'layout');
    redirect(`/${workspaceSlug}`);
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return {
      error: err?.message || 'Failed to reset password. The recovery link may have expired.',
    };
  }
}

export async function changePasswordAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const currentPassword = formData.get('current-password') as string;
  const newPassword = formData.get('new-password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  const parsed = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please check your password inputs.' };
  }

  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user || !user.email) {
      return { error: 'You must be signed in to change your password.' };
    }

    const refusal = await rateLimitRefusal(RATELIMIT_POLICIES.passwordChange, [user.id]);
    if (refusal) return { error: refusal };

    // Checked on a separate client, so this session (and its two-factor level) stays as it is.
    const check = await services.auth.verifyPassword(user.email, currentPassword, captchaTokenFrom(formData));
    if (!check.ok) {
      return {
        error: authErrorCode(check) === 'invalid_credentials' ? 'Your current password is incorrect.' : authErrorMessage(check),
      };
    }

    // Supabase checks the current password too when "Require current password" is on.
    const { error: updateError } = await services.auth.updateUserPassword(newPassword, currentPassword);
    if (updateError) {
      return { error: authErrorMessage(updateError) };
    }

    // A new password ends every other login, including any device someone else may be using.
    // This one stays signed in.
    try {
      const current = await services.auth.getSessionIdentity();
      if (current && current.userId === user.id) {
        await services.session.revokeAllOtherSessions(current);
      }
      const { error: othersError } = await services.auth.signOutOthers();
      if (othersError) throw othersError;
    } catch (sessionErr) {
      log.warn({ err: sessionErr }, 'Password changed, but signing out other devices failed');
      return { success: 'Password updated. Sign out your other devices from the Security page.' };
    }

    return { success: 'Password updated. Your other devices were signed out.' };
  } catch (err: any) {
    return {
      error: err?.message || 'Failed to update password. Please try again.',
    };
  }
}


export async function loginAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  // Set by the login form from `?redirect=` (an invite link, a page the visitor was sent from).
  const requestedPath = safeReturnPath(formData.get('redirect') as string | null, '/');

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please fill in all required fields.' };
  }

  // Per visitor and address: slows down password guessing against one account from one place.
  const refusal = await rateLimitRefusal(RATELIMIT_POLICIES.authLogin, [
    await getClientIp(),
    parsed.data.email.toLowerCase(),
  ]);
  if (refusal) return { error: refusal };

  try {
    const services = await getServerServices();
    const { data, error } = await services.auth.signInWithPassword(email, password, captchaTokenFrom(formData));

    if (error) {
      return { error: authErrorMessage(error) };
    }

    // Supabase Auth's response, not the session cookie: it decides whether the user has to
    // enter a two-factor code next.
    const user = data.user;
    let redirectTo = requestedPath;
    let workspace: Workspace | null = null;
    if (user) {
      // Records the device, finds the workspace and sends users with two-factor sign-in to /mfa.
      ({ redirectTo, workspace } = await finishSignIn({
        user,
        identity: await services.auth.getSessionIdentity(),
        headers: await headers(),
        requestedPath,
      }));
    }

    // Fire server-side Login (no client echo needed — Login is server-only
    // in this integration; the user is already known to the page).
    try {
      const headerList = await headers();
      const ip =
        headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headerList.get('x-real-ip') ||
        undefined;
      const userAgent = headerList.get('user-agent') || undefined;
      await sendServerEvent({
        eventName: 'Login',
        eventId: `login_${randomUUID()}`,
        actionSource: 'website',
        userData: {
          email,
          externalId: user?.id,
        },
        clientIp: ip,
        userAgent,
      });
    } catch (e) {
      // already logged
    }

    // PostHog: identify + group + logged_in.
    try {
      captureLogin({
        userId: user?.id,
        email,
        workspaceId: workspace?.id,
        workspaceSlug: workspace?.slug,
      });
    } catch (e) {
      // already logged
    }

    revalidatePath('/', 'layout');
    redirect(redirectTo);
  } catch (err: any) {
    // Next.js redirect() works by throwing an internal NEXT_REDIRECT error. We must rethrow it.
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { error: err?.message || 'Login failed due to a network connection error. Please check your Supabase URL & keys.' };
  }
}

export async function signupAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;
  const requestedPath = safeReturnPath(formData.get('redirect') as string | null, '/');

  const parsed = signupSchema.safeParse({
    name,
    email,
    password,
    confirmPassword,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please fill in all required fields.' };
  }
  if (formData.get('accept_terms') !== 'on') {
    return { error: TERMS_REQUIRED_MESSAGE };
  }

  const refusal = await rateLimitRefusal(RATELIMIT_POLICIES.authSignup, [await getClientIp()]);
  if (refusal) return { error: refusal };

  try {
    const services = await getServerServices();
    // Where the confirmation link should take the person (an invite, say). The confirm route reads
    // it from their metadata. Supabase's own link (the old template) gets it as a callback redirect.
    const signupRedirect = requestedPath !== '/' ? requestedPath : undefined;
    const emailRedirectTo = `${await requestOrigin()}/api/auth/callback${
      signupRedirect ? `?redirect=${encodeURIComponent(signupRedirect)}` : ''
    }`;
    const { data, error } = await services.auth.signUp(email, password, name, {
      emailRedirectTo,
      signupRedirect,
      captchaToken: captchaTokenFrom(formData),
    });

    if (error) {
      return { error: authErrorMessage(error) };
    }

    // A sign-up for an address that already has an account comes back as a user without
    // identities: nothing to record or claim for it.
    const isNewAccount = Boolean(data.user && (data.user.identities?.length ?? 0) > 0);

    // The terms they just accepted, recorded by the server (users can't write these columns).
    if (isNewAccount && data.user) {
      try {
        const admin = await getServerAdminServices();
        await admin.profile.recordTermsAcceptance(data.user.id, TERMS_VERSION);
      } catch (e) {
        // finishSignIn asks again (/accept-terms) when it finds no acceptance.
        log.error({ err: e, userId: data.user.id }, 'Could not record the terms acceptance at sign-up');
      }
    }

    // Claimed now, whether or not the email still needs confirming: the confirmation link may be
    // opened on another device, without the token.
    const waitlistToken = formData.get('waitlist_token') as string | null;
    if (waitlistToken && isNewAccount) {
      try {
        await services.waitlist.claimInvite(waitlistToken);
      } catch (e) {
        log.warn({ err: e, waitlistToken }, "Could not claim waitlist token");
      }
    }

    if (data.session && data.user) {
      // Records the device and finds the workspace the sign-up trigger made.
      const { redirectTo, workspace } = await finishSignIn({
        user: data.user,
        identity: await services.auth.getSessionIdentity(),
        headers: await headers(),
        requestedPath,
      });

      // Fire server-side CompleteRegistration and hand the eventId to
      // the client via a short-lived cookie so the browser pixel can
      // echo it on the next page (Meta dedupes by eventId).
      const complregEventId = `cr_${randomUUID()}`;
      try {
        const headerList = await headers();
        const ip =
          headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          headerList.get('x-real-ip') ||
          undefined;
        const userAgent = headerList.get('user-agent') || undefined;
        const referer = headerList.get('referer') || undefined;
        await sendServerEvent({
          eventName: 'CompleteRegistration',
          eventId: complregEventId,
          eventSourceUrl: referer,
          actionSource: 'website',
          userData: {
            email: data.user.email,
            externalId: data.user.id,
          },
          customData: {
            content_name: 'signup',
            status: 'signed_in',
          },
          clientIp: ip,
          userAgent,
        });
      } catch (e) {
        // already logged inside sendServerEvent
      }

      const cookieStore = await cookies();
      cookieStore.set('meta_event_complreg', complregEventId, {
        httpOnly: false, // must be readable by the client pixel helper
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60, // 1 minute is enough for the post-redirect echo
        path: '/',
      });

      // PostHog: identify + group + signup_completed.
      try {
        captureSignup({
          userId: data.user.id,
          email: data.user.email || email,
          status: 'signed_in',
          workspaceId: workspace?.id,
          workspaceSlug: workspace?.slug,
        });
      } catch (e) {
        // already logged
      }

      revalidatePath('/', 'layout');
      redirect(redirectTo);
    }

    // Email-pending branch: no session yet, but the account exists.
    try {
      captureSignup({
        email,
        status: 'pending_email_confirmation',
      });
    } catch (e) {
      // already logged
    }

    return {
      success: 'Account created! Check your email for the link to confirm your address.',
    };
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { error: err?.message || 'Sign up failed due to a network connection error. Please check your Supabase URL & keys.' };
  }
}

/** Signs this device out only: flags its session row revoked and ends its Supabase login. */
export async function signOutAction() {
  const services = await getServerServices();
  await signOutCurrentSession(services, await cookies());
  revalidatePath('/', 'layout');
  redirect('/login');
}
