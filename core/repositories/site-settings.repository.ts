import type { SupabaseClient } from "@supabase/supabase-js";

export interface SiteSettingRow {
  key: string;
  value: unknown;
  updatedBy: string | null;
  updatedAt: string;
}

/** Site-wide settings (public.site_settings), one row per key. Service role only. */
export interface ISiteSettingsRepository {
  get(key: string): Promise<SiteSettingRow | null>;
  set(key: string, value: unknown, updatedBy: string | null): Promise<SiteSettingRow>;
}

const COLUMNS = "key, value, updated_by, updated_at";

function toRow(row: Record<string, unknown>): SiteSettingRow {
  return {
    key: String(row.key),
    value: row.value ?? null,
    updatedBy: (row.updated_by as string | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseSiteSettingsRepository implements ISiteSettingsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async get(key: string): Promise<SiteSettingRow | null> {
    const { data, error } = await this.supabase.from("site_settings").select(COLUMNS).eq("key", key).maybeSingle();
    if (error) throw new Error(`Couldn't read the site setting ${key}: ${error.message}`);
    return data ? toRow(data as Record<string, unknown>) : null;
  }

  async set(key: string, value: unknown, updatedBy: string | null): Promise<SiteSettingRow> {
    const { data, error } = await this.supabase
      .from("site_settings")
      .upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select(COLUMNS)
      .single();
    if (error) throw new Error(`Couldn't save the site setting ${key}: ${error.message}`);
    return toRow(data as Record<string, unknown>);
  }
}
