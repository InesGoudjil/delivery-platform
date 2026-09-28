'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getServerServices } from '@/core/server';
import { sendServerEvent } from '@/lib/meta';
import { captureSignup, captureLogin } from '@/lib/posthog';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/lib/validations/auth';

export interface AuthState {
  error?: string | null;
  success?: string | null;
}

export async function requestPasswordResetAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string;

  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please enter a valid email address.' };
  }

  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;

    const services = await getServerServices();
    const redirectTo = `${origin}/api/auth/callback?next=/reset-password`;

    const { error } = await services.auth.resetPasswordForEmail(email, redirectTo);
    if (error) {
      return { error: error.message };
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

    // Verify current password by signing in
    const { error: signInError } = await services.auth.signInWithPassword(
      user.email,
      currentPassword
    );

    if (signInError) {
      return { error: 'Your current password is incorrect.' };
    }

    // Apply new password
    const { error: updateError } = await services.auth.updateUserPassword(newPassword);
    if (updateError) {
      return { error: updateError.message };
    }

    return { success: 'Account password updated successfully!' };
  } catch (err: any) {
    return {
      error: err?.message || 'Failed to update password. Please try again.',
    };
  }
}


export async function loginAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please fill in all required fields.' };
  }

  try {
    const services = await getServerServices();
    const { error } = await services.auth.signInWithPassword(email, password);

    if (error) {
      return { error: error.message };
    }

    const user = await services.auth.getCurrentUser();
    let workspace = null;
    if (user) {
      const userWorkspaces = await services.workspace.getUserWorkspaces(user.id);
      workspace = userWorkspaces[0] || await services.workspace.getOrCreateWorkspace(user.id, user.user_metadata?.full_name || 'My Studio').catch(() => null);
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
    redirect(workspace?.slug ? `/${workspace.slug}` : '/');
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

  const parsed = signupSchema.safeParse({
    name,
    email,
    password,
    confirmPassword,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Please fill in all required fields.' };
  }

  try {
    const services = await getServerServices();
    const { data, error } = await services.auth.signUp(email, password, name);

    if (error) {
      return { error: error.message };
    }

    if (data.session && data.user) {
      const waitlistToken = formData.get('waitlist_token') as string | null;
      if (waitlistToken) {
        try {
          await services.waitlist.claimInvite(waitlistToken);
        } catch (e) {
          console.warn("Could not claim waitlist token:", e);
        }
      }

      const workspace = await services.workspace.getOrCreateWorkspace(data.user.id, name);

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
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        });
      } catch (e) {
        // already logged
      }

      revalidatePath('/', 'layout');
      redirect(`/${workspace.slug}`);
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
      success: 'Account created! Please check your email to confirm your subscription.',
    };
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { error: err?.message || 'Sign up failed due to a network connection error. Please check your Supabase URL & keys.' };
  }
}

export async function signOutAction() {
  const services = await getServerServices();
  await services.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
