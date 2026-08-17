import { createClient } from '@/lib/supabase/server';
import { createCoreServices, CoreServices } from './container';

/**
 * Server-side helper to get initialized core domain services with dependency injection.
 * Hides direct Supabase client initialization from UI components and Server Actions.
 */
export async function getServerServices(): Promise<CoreServices['services']> {
  const supabase = await createClient();
  const { services } = createCoreServices(supabase);
  return services;
}
