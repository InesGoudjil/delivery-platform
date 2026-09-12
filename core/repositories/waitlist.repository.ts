import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import {
  WaitlistEntry,
  CreateWaitlistEntryDTO,
  WaitlistPositionResult,
} from "@/core/entities/waitlist";

export interface IWaitlistRepository {
  create(dto: CreateWaitlistEntryDTO): Promise<WaitlistEntry>;
  findById(id: string): Promise<WaitlistEntry | null>;
  findByEmail(email: string): Promise<WaitlistEntry | null>;
  findByReferralCode(code: string): Promise<WaitlistEntry | null>;
  findByInviteToken(token: string): Promise<WaitlistEntry | null>;
  incrementReferralCount(referrerId: string, pointsToAdd: number): Promise<void>;
  getPosition(entryId: string): Promise<WaitlistPositionResult>;
  listTopPending(limit: number): Promise<WaitlistEntry[]>;
  markInvited(entryId: string, inviteToken: string): Promise<WaitlistEntry>;
  markRegistered(entryId: string): Promise<WaitlistEntry>;
  getMetrics(): Promise<{ total: number; pending: number; invited: number; registered: number }>;
}

export class SupabaseWaitlistRepository implements IWaitlistRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): WaitlistEntry {
    return {
      id: row.id,
      email: row.email,
      status: row.status,
      referralCode: row.referral_code,
      referredById: row.referred_by_id,
      referralCount: row.referral_count ?? 0,
      priorityScore: row.priority_score ?? 0,
      inviteToken: row.invite_token,
      invitedAt: row.invited_at,
      registeredAt: row.registered_at,
      role: row.role,
      companySize: row.company_size,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(dto: CreateWaitlistEntryDTO): Promise<WaitlistEntry> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .insert({
        email: dto.email.toLowerCase().trim(),
        referral_code: dto.referralCode,
        referred_by_id: dto.referredById || null,
        role: dto.role || null,
        company_size: dto.companySize || null,
        metadata: dto.metadata || {},
        status: "pending",
        priority_score: 0,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create waitlist entry: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async findById(id: string): Promise<WaitlistEntry | null> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find waitlist entry by ID: ${error.message}`);
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async findByEmail(email: string): Promise<WaitlistEntry | null> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find waitlist entry by email: ${error.message}`);
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async findByReferralCode(code: string): Promise<WaitlistEntry | null> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("*")
      .eq("referral_code", code.trim())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find waitlist entry by referral code: ${error.message}`);
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async findByInviteToken(token: string): Promise<WaitlistEntry | null> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("*")
      .eq("invite_token", token.trim())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find waitlist entry by invite token: ${error.message}`);
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async incrementReferralCount(referrerId: string, pointsToAdd: number): Promise<void> {
    // Read current values and update (or use RPC if available)
    const current = await this.findById(referrerId);
    if (!current) return;

    const { error } = await (this.supabase as any)
      .from("waitlist_entries")
      .update({
        referral_count: (current.referralCount || 0) + 1,
        priority_score: (current.priorityScore || 0) + pointsToAdd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referrerId);

    if (error) {
      console.error(`Failed to increment referral count for ${referrerId}:`, error);
    }
  }

  async getPosition(entryId: string): Promise<WaitlistPositionResult> {
    const entry = await this.findById(entryId);
    if (!entry) {
      throw new Error("Waitlist entry not found");
    }

    // Attempt to invoke the Postgres function get_waitlist_position
    try {
      const { data, error } = await (this.supabase as any).rpc("get_waitlist_position", {
        p_entry_id: entryId,
      });

      if (!error && data && data.length > 0) {
        return {
          position: Number(data[0].position),
          totalPending: Number(data[0].total_pending),
          referralCode: entry.referralCode,
          referralCount: entry.referralCount,
          priorityScore: entry.priorityScore,
          status: entry.status,
        };
      }
    } catch {
      // Fallback in case RPC is not yet migrated in local client
    }

    // Graceful fallback query
    const { count: aheadCount } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .or(`priority_score.gt.${entry.priorityScore},and(priority_score.eq.${entry.priorityScore},created_at.lt.${entry.createdAt})`);

    const { count: totalPendingCount } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return {
      position: entry.status === "pending" ? (aheadCount ?? 0) + 1 : 0,
      totalPending: totalPendingCount ?? 1,
      referralCode: entry.referralCode,
      referralCount: entry.referralCount,
      priorityScore: entry.priorityScore,
      status: entry.status,
    };
  }

  async listTopPending(limit: number = 50): Promise<WaitlistEntry[]> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("*")
      .eq("status", "pending")
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list pending entries: ${error.message}`);
    }

    return (data || []).map((r: any) => this.mapRowToEntity(r));
  }

  async markInvited(entryId: string, inviteToken: string): Promise<WaitlistEntry> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .update({
        status: "invited",
        invite_token: inviteToken,
        invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to mark entry invited: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async markRegistered(entryId: string): Promise<WaitlistEntry> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .update({
        status: "registered",
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to mark entry registered: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async getMetrics(): Promise<{ total: number; pending: number; invited: number; registered: number }> {
    const { data, error } = await (this.supabase as any)
      .from("waitlist_entries")
      .select("status");

    if (error || !data) {
      return { total: 0, pending: 0, invited: 0, registered: 0 };
    }

    const counts = { total: data.length, pending: 0, invited: 0, registered: 0 };
    for (const row of data) {
      if (row.status === "pending") counts.pending++;
      else if (row.status === "invited") counts.invited++;
      else if (row.status === "registered") counts.registered++;
    }

    return counts;
  }
}
