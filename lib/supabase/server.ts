import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { env } from '@/lib/env';

/**
 * Request-scoped singleton Supabase Server Client.
 * Wrapped with React `cache()` to reuse the client instance within the same request lifecycle.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
});

/**
 * Admin Supabase client using SUPABASE_SERVICE_ROLE_KEY to bypass RLS in backend operations like Webhooks.
 */
export function createAdminClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const hasValidServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const key = hasValidServiceKey
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
