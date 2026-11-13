import type { SupabaseClient } from "@supabase/supabase-js";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ repository: "AuthUserEmailLookup" });

/** Email addresses of users, read from Supabase Auth. Only works with the service role key. */
export interface IAuthEmailLookup {
  emailsByUserId(userIds: string[]): Promise<Map<string, string>>;
}

export class SupabaseAuthEmailLookup implements IAuthEmailLookup {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Users without an address (or that can't be read) are left out, so nothing is sent to a guess. */
  async emailsByUserId(userIds: string[]): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    await Promise.all(
      [...new Set(userIds)].map(async (userId) => {
        try {
          const { data, error } = await this.supabase.auth.admin.getUserById(userId);
          if (error) {
            log.warn({ error: error.message }, "Couldn't read a user's email address");
            return;
          }
          if (data.user?.email) found.set(userId, data.user.email);
        } catch (err) {
          log.warn({ err }, "Couldn't read a user's email address");
        }
      })
    );
    return found;
  }
}
