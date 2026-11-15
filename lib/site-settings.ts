import { z } from "zod";

/*
 * Site-wide settings, set in the admin panel (Admin -> Site settings) and stored in
 * public.site_settings, one row per key. Each one is listed here with the shape of its value and
 * the value that applies while it has never been saved, or when what's saved no longer fits the
 * shape.
 *
 * Adding a setting: an entry in SITE_SETTINGS, an admin action that saves it, and a card on the
 * admin page (app/(admin)/admin/site).
 */

function siteSetting<S extends z.ZodType>(schema: S, defaultValue: z.infer<S>) {
  return { schema, defaultValue };
}

export const SITE_SETTINGS = {
  /**
   * The public demo room: the delivery shown at /demo, and whether the landing page links to it.
   * Guests can't save anything in that room (core/security/client-room.ts).
   */
  demo_room: siteSetting(
    z.object({
      deliveryId: z.guid().nullable(),
      showOnLanding: z.boolean(),
    }),
    { deliveryId: null, showOnLanding: false }
  ),
};

export type SiteSettingKey = keyof typeof SITE_SETTINGS;

export type SiteSettingValue<K extends SiteSettingKey> = z.infer<(typeof SITE_SETTINGS)[K]["schema"]>;

/** The value that applies while the setting has never been saved. */
export function defaultSiteSetting<K extends SiteSettingKey>(key: K): SiteSettingValue<K> {
  return structuredClone(SITE_SETTINGS[key].defaultValue) as SiteSettingValue<K>;
}

/** The stored value when it fits the setting's shape, otherwise null. */
export function parseSiteSetting<K extends SiteSettingKey>(key: K, raw: unknown): SiteSettingValue<K> | null {
  const parsed = SITE_SETTINGS[key].schema.safeParse(raw);
  return parsed.success ? (parsed.data as SiteSettingValue<K>) : null;
}
