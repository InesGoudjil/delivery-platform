import { cache } from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createCoreServices, CoreServices } from './container';
import { env } from '@/lib/env';

function memoizeAsyncMethod<T extends object, K extends keyof T>(
  target: T,
  methodName: K,
  cacheMap: Map<string, Promise<any>>
) {
  const original = target[methodName];
  if (typeof original !== 'function') return;

  (target as any)[methodName] = (...args: any[]) => {
    const key = `${String(methodName)}:${JSON.stringify(args)}`;
    const existing = cacheMap.get(key);
    if (existing) return existing;

    const promise = Promise.resolve(original.apply(target, args)).catch((err) => {
      cacheMap.delete(key);
      throw err;
    });
    cacheMap.set(key, promise);
    return promise;
  };
}

function invalidateOnMutation<T extends object>(
  target: T,
  mutationMethods: (keyof T)[],
  cacheMap: Map<string, Promise<any>>
) {
  for (const methodName of mutationMethods) {
    const original = target[methodName];
    if (typeof original !== 'function') continue;

    (target as any)[methodName] = async (...args: any[]) => {
      const result = await original.apply(target, args);
      cacheMap.clear();
      return result;
    };
  }
}

/**
 * Attaches request-scoped in-flight Promise deduplication to hot read paths
 * so layouts, pages, and server components within the same HTTP request
 * never fire duplicate Auth or PostgREST queries.
 */
function attachRequestMemoization(core: CoreServices): CoreServices {
  const reqCache = new Map<string, Promise<any>>();

  // 1. Auth lookups
  memoizeAsyncMethod(core.services.auth, 'getCurrentUser', reqCache);
  memoizeAsyncMethod(core.services.auth, 'getCurrentUserProfile', reqCache);

  // 2. Workspace repository lookups
  memoizeAsyncMethod(core.repositories.workspace, 'findById', reqCache);
  memoizeAsyncMethod(core.repositories.workspace, 'findBySlug', reqCache);
  memoizeAsyncMethod(core.repositories.workspace, 'findByOwnerId', reqCache);
  memoizeAsyncMethod(core.repositories.workspace, 'listByOwnerId', reqCache);
  invalidateOnMutation(
    core.repositories.workspace,
    ['create', 'update'],
    reqCache
  );

  // 3. Subscription, Plan & Workspace Features repository lookups
  memoizeAsyncMethod(core.repositories.subscription, 'findByWorkspaceId', reqCache);
  invalidateOnMutation(
    core.repositories.subscription,
    ['create', 'update'],
    reqCache
  );

  memoizeAsyncMethod(core.repositories.plan, 'findById', reqCache);
  memoizeAsyncMethod(core.repositories.plan, 'findBySlug', reqCache);
  memoizeAsyncMethod(core.repositories.plan, 'listActivePlans', reqCache);
  invalidateOnMutation(
    core.repositories.plan,
    ['create', 'update', 'delete'],
    reqCache
  );

  memoizeAsyncMethod(core.repositories.workspaceFeatures, 'findByWorkspaceId', reqCache);
  invalidateOnMutation(
    core.repositories.workspaceFeatures,
    ['upsertFeatures'],
    reqCache
  );

  // 4. User Profile & Workspace Member lookups
  memoizeAsyncMethod(core.repositories.userProfile, 'findById', reqCache);
  invalidateOnMutation(
    core.repositories.userProfile,
    ['update', 'upsert'],
    reqCache
  );

  memoizeAsyncMethod(core.repositories.workspaceMember, 'findByWorkspaceAndUserId', reqCache);
  memoizeAsyncMethod(core.repositories.workspaceMember, 'listByUserId', reqCache);
  invalidateOnMutation(
    core.repositories.workspaceMember,
    ['addMember', 'removeMember', 'updateRole'],
    reqCache
  );

  return core;
}

/**
 * Helper to retrieve full CoreServices container including storageProvider and repositories.
 * Wrapped in React `cache()` so the DI container is instantiated at most once per HTTP request.
 */
export const getServerCore = cache(async (): Promise<CoreServices> => {
  const supabase = await createClient();
  const hasServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const adminSupabase = hasServiceKey ? createAdminClient() : undefined;
  return attachRequestMemoization(createCoreServices(supabase, { adminSupabase }));
});

/**
 * Server-side helper to get initialized core domain services with dependency injection.
 * Hides direct Supabase client initialization from UI components and Server Actions.
 */
export const getServerServices = cache(async (): Promise<CoreServices['services']> => {
  const { services } = await getServerCore();
  return services;
});

/**
 * Server-side admin helper to bypass RLS for authenticated server action operations.
 * Falls back safely to user authenticated client if SUPABASE_SERVICE_ROLE_KEY is omitted.
 */
export const getServerAdminServices = cache(async (): Promise<CoreServices['services']> => {
  const hasServiceKey =
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '';

  const supabase = hasServiceKey ? createAdminClient() : await createClient();
  const { services } = createCoreServices(supabase as any);
  return services;
});
