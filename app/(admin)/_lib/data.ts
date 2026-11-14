import { cache } from "react";
import { getPlatformAdminServices } from "@/core/admin/context";

/** Both branches name both fields, so reading them works without strict null checks narrowing the union. */
export type Attempt<T> = { ok: true; value: T; error?: undefined } | { ok: false; error: unknown; value?: undefined };

/**
 * Loads data for a page or section, catching the error so the caller can show it in place of
 * the section. Keeps JSX out of try/catch, where rendering errors wouldn't be caught anyway.
 */
export async function attempt<T>(load: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    return { ok: false, error };
  }
}

/** The dashboard numbers, loaded once per request however many sections use them. */
export const getAdminKpis = cache(async () => {
  const admin = await getPlatformAdminServices();
  return admin.readModel.platformKpis();
});
