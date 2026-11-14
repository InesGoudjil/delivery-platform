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

  const url =
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL.trim() !== ''
      ? env.NEXT_PUBLIC_SUPABASE_URL
      : 'https://placeholder.supabase.co';

  const key =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() !== ''
      ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : 'placeholder-anon-key';

  return createServerClient(
    url,
    key,
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
 * Service-role client that refuses to start without a real service key, instead of falling back
 * to the anon key like createAdminClient(). The admin panel uses it, so a missing key shows up
 * as an error rather than as pages that quietly show less data.
 */
export function createServiceRoleClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || url === 'https://placeholder.supabase.co') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  if (!key || key === 'your-supabase-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set, so platform data can\'t be read.');
  }
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Admin Supabase client using SUPABASE_SERVICE_ROLE_KEY to bypass RLS in backend operations like Webhooks.
 */
export function createAdminClient() {
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL.trim() !== ''
      ? env.NEXT_PUBLIC_SUPABASE_URL
      : 'https://placeholder.supabase.co';

  const hasValidServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const key = hasValidServiceKey
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() !== ''
      ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : 'placeholder-anon-key';

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
