'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SupabaseWorkspaceRepository } from '@/infrastructure/repositories/supabase-workspace.repository';
import { GetOrCreateWorkspaceUseCase } from '@/core/use-cases/workspace/get-or-create-workspace.use-case';

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: workspace } = await (supabase as any)
    .from('workspaces')
    .select('slug')
    .eq('owner_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session && data.user) {
    const workspaceRepo = new SupabaseWorkspaceRepository(supabase);
    const getOrCreate = new GetOrCreateWorkspaceUseCase(workspaceRepo);
    const workspace = await getOrCreate.execute(data.user.id, name);

    revalidatePath('/', 'layout');
    redirect(`/${workspace.slug}`);
  }

  return {
    success: 'Account created! Please check your email to confirm your subscription.',
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
