import { cache } from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createCoreServices, CoreServices } from './container';
import { env } from '@/lib/env';
import type { QueryArea } from './observability/query-log';
import {
  backgroundQueryLog,
  existingRequestQueryLog,
  requestQueryLog,
} from './observability/request-query-log';

/**
 * Server-side helper to get initialized core domain services with dependency injection.
 * Hides direct Supabase client initialization from UI components and Server Actions.
 * Every query is logged with the request's ID and path (core/observability/query-log.ts).
 *
 * Cached per request while rendering: the layout, the page, its Suspense children and the
 * guards they call share one client and one set of services. Outside a render (Server Actions,
 * API routes) every call builds its own, as before.
 */
export const getServerServices = cache(async (): Promise<CoreServices['services']> => {
  const supabase = await createClient();
  const hasServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const adminSupabase = hasServiceKey ? createAdminClient() : undefined;
  // The session cookies above already make this request-bound, so reading its headers is free.
  const { services } = createCoreServices(supabase, { adminSupabase, queryLog: await requestQueryLog() });
  return services;
});

export interface AdminServicesOptions {
  /**
   * Log queries with this request's ID and path. Only for pages rendered per request: reading
   * the request makes a static or ISR page dynamic. Without it, queries are logged with this
   * request's details when getServerServices() already read them, else under `area`.
   */
  request?: boolean;
  /** The area to log queries under when the request isn't read (default "server"). */
  area?: QueryArea;
}

/**
 * Server-side admin helper to bypass RLS for authenticated server action operations.
 * Falls back safely to user authenticated client if SUPABASE_SERVICE_ROLE_KEY is omitted.
 */
export async function getServerAdminServices(options: AdminServicesOptions = {}): Promise<CoreServices['services']> {
  const hasServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const supabase = hasServiceKey ? createAdminClient() : await createClient();
  const queryLog = options.request
    ? await requestQueryLog()
    : ((await existingRequestQueryLog()) ?? backgroundQueryLog(options.area));
  const { services } = createCoreServices(supabase as any, { queryLog });
  return services;
}

/**
 * Helper to retrieve full CoreServices container including storageProvider and repositories.
 */
export async function getServerCore(): Promise<CoreServices> {
  const supabase = await createClient();
  const hasServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const adminSupabase = hasServiceKey ? createAdminClient() : undefined;
  return createCoreServices(supabase, { adminSupabase, queryLog: await requestQueryLog() });
}
