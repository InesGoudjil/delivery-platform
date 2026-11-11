import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

/**
 * Ledger of Stripe objects (checkout sessions, events) that have already been
 * applied to a workspace. Backed by `processed_billing_events`, which only the
 * service role can read or write.
 */
export interface IProcessedBillingEventRepository {
  /**
   * Records `id` as applied. Returns true the first time and false if it was
   * already recorded, so callers apply the side effect only when it returns true.
   */
  claim(id: string, workspaceId: string | null, kind: string): Promise<boolean>;
  /** Removes a claim so a failed application can be retried. */
  release(id: string): Promise<void>;
}

const UNIQUE_VIOLATION = "23505";

export class SupabaseProcessedBillingEventRepository implements IProcessedBillingEventRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async claim(id: string, workspaceId: string | null, kind: string): Promise<boolean> {
    const { error } = await (this.supabase as any)
      .from("processed_billing_events")
      .insert({ id, workspace_id: workspaceId, kind });

    if (!error) return true;
    if (error.code === UNIQUE_VIOLATION) return false;
    throw new Error(`Error recording billing event: ${error.message}`);
  }

  async release(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("processed_billing_events")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error releasing billing event: ${error.message}`);
  }
}
