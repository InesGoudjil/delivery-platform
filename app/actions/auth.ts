'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerServices } from '@/core/server';

export interface AuthState {
  error?: string | null;
  success?: string | null;
}

export async function loginAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please fill in all required fields.' };
  }

  const services = await getServerServices();
  const { error } = await services.auth.signInWithPassword(email, password);

  if (error) {
    return { error: error.message };
  }

  const user = await services.auth.getCurrentUser();
  const workspace = user ? await services.workspace.getWorkspaceByOwnerId(user.id) : null;

  revalidatePath('/', 'layout');
  redirect(workspace?.slug ? `/${workspace.slug}` : '/');
}

export async function signupAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  if (!email || !password || !name) {
    return { error: 'Please fill in all required fields.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  if (confirmPassword && password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const services = await getServerServices();
  const { data, error } = await services.auth.signUp(email, password, name);

  if (error) {
    return { error: error.message };
  }

  if (data.session && data.user) {
    const workspace = await services.workspace.getOrCreateWorkspace(data.user.id, name);

    revalidatePath('/', 'layout');
    redirect(`/${workspace.slug}`);
  }

  return {
    success: 'Account created! Please check your email to confirm your subscription.',
  };
}

export async function signOutAction() {
  const services = await getServerServices();
  await services.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
