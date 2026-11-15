import type { ISiteSettingsRepository } from "@/core/repositories/site-settings.repository";
import {
  SITE_SETTINGS,
  defaultSiteSetting,
  parseSiteSetting,
  type SiteSettingKey,
  type SiteSettingValue,
} from "@/lib/site-settings";

export interface SiteSetting<K extends SiteSettingKey> {
  value: SiteSettingValue<K>;
  /** When an admin last saved it. Null while it has never been saved (the value is the default). */
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * Typed access to the site-wide settings (lib/site-settings.ts). A missing row, or one whose value
 * no longer fits the setting's shape, reads as the default, so a page never breaks on a bad row.
 * Service role inside: only the admin panel writes, and only after its platform-admin check.
 */
export class SiteSettingsService {
  constructor(private readonly repo: ISiteSettingsRepository) {}

  async get<K extends SiteSettingKey>(key: K): Promise<SiteSettingValue<K>> {
    return (await this.getWithMeta(key)).value;
  }

  async getWithMeta<K extends SiteSettingKey>(key: K): Promise<SiteSetting<K>> {
    const row = await this.repo.get(key);
    const value = row ? parseSiteSetting(key, row.value) : null;
    return {
      value: value ?? defaultSiteSetting(key),
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  }

  /** Checks the value against the setting's shape, then saves it. */
  async set<K extends SiteSettingKey>(key: K, value: SiteSettingValue<K>, updatedBy: string | null): Promise<SiteSetting<K>> {
    const parsed = SITE_SETTINGS[key].schema.safeParse(value);
    if (!parsed.success) throw new Error(`That isn't a valid value for the site setting ${key}.`);
    const row = await this.repo.set(key, parsed.data, updatedBy);
    return { value: parsed.data as SiteSettingValue<K>, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
  }
}
