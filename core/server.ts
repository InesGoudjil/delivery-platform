import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createCoreServices, CoreServices } from './container';
import { env } from '@/lib/env';

/**
 * Server-side helper to get initialized core domain services with dependency injection.
 * Hides direct Supabase client initialization from UI components and Server Actions.
 */
export async function getServerServices(): Promise<CoreServices['services']> {
  const supabase = await createClient();
  const { services } = createCoreServices(supabase);
  return services;
}

/**
 * Server-side admin helper to bypass RLS for authenticated server action operations.
 * Falls back safely to user authenticated client if SUPABASE_SERVICE_ROLE_KEY is omitted.
 */
export async function getServerAdminServices(): Promise<CoreServices['services']> {
  const hasServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const supabase = hasServiceKey ? createAdminClient() : await createClient();
  const { services } = createCoreServices(supabase as any);
  return services;
}

/**
 * Helper to retrieve full CoreServices container including storageProvider and repositories.
 */
export async function getServerCore(): Promise<CoreServices> {
  const supabase = await createClient();
  return createCoreServices(supabase);
}
