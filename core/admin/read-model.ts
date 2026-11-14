import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAuthEmailLookup } from "@/core/repositories/auth-user-email.repository";
import { COMMENT_QUIET_SECONDS } from "@/core/services/whatsapp-notification.service";
import type { Logger } from "@/lib/logger";
import { timedQuery } from "./query-timing";
import type {
  AdminDailyPoint,
  AdminFailedNotification,
  AdminNotificationQuery,
  AdminNotificationRow,
  AdminPage,
  AdminPendingBatch,
  AdminPlanMrr,
  AdminSchedulerStatus,
  AdminSearchResults,
  AdminPlatformKpis,
  AdminUserQuery,
  AdminUserRow,
  AdminWorkspaceDelivery,
  AdminWorkspaceMember,
  AdminWorkspaceQuery,
  AdminWorkspaceRow,
} from "./types";

type Row = Record<string, unknown>;

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));
const numOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);
const str = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

function toWorkspaceRow(row: Row): AdminWorkspaceRow {
  return {
    id: String(row.id),
    brandName: String(row.brand_name ?? ""),
    slug: String(row.slug ?? ""),
    accountType: String(row.account_type ?? "individual"),
    createdAt: String(row.created_at),
    ownerId: String(row.owner_id),
    ownerEmail: str(row.owner_email),
    ownerName: str(row.owner_name),
    planId: str(row.plan_id),
    planName: str(row.plan_name),
    planSlug: str(row.plan_slug),
    planPriceCents: numOrNull(row.plan_price_cents),
    planCurrency: str(row.plan_currency),
    planInterval: (str(row.plan_interval) as AdminWorkspaceRow["planInterval"]) ?? null,
    subscriptionStatus: (str(row.subscription_status) as AdminWorkspaceRow["subscriptionStatus"]) ?? null,
    trialEndsAt: str(row.trial_ends_at),
    currentPeriodEnd: str(row.current_period_end),
    stripeBilled: Boolean(row.stripe_billed),
    effectivePlanSlug: str(row.effective_plan_slug),
    storageUsedBytes: num(row.storage_used_bytes),
    storageLimitGb: numOrNull(row.storage_limit_gb),
    storageOverrideGb: numOrNull(row.storage_override_gb),
    deliveriesCount: num(row.deliveries_count),
    activeDeliveriesCount: num(row.active_deliveries_count),
    membersCount: num(row.members_count),
    lastActivityAt: str(row.last_activity_at),
    hasOverrides: Boolean(row.has_overrides),
    suspendedAt: str(row.suspended_at),
    suspendedReason: str(row.suspended_reason),
  };
}

function toUserRow(row: Row): AdminUserRow {
  const workspaceId = str(row.primary_workspace_id);
  return {
    id: String(row.id),
    email: str(row.email),
    fullName: str(row.full_name),
    avatarUrl: str(row.avatar_url),
    platformRole: row.platform_role === "admin" ? "admin" : "user",
    createdAt: String(row.created_at),
    emailConfirmedAt: str(row.email_confirmed_at),
    lastSignInAt: str(row.last_sign_in_at),
    bannedUntil: str(row.banned_until),
    mfaEnabled: Boolean(row.mfa_enabled),
    ownedWorkspaces: num(row.owned_workspaces),
    memberships: num(row.memberships),
    primaryWorkspace: workspaceId
      ? { id: workspaceId, name: String(row.primary_workspace_name ?? ""), slug: String(row.primary_workspace_slug ?? "") }
      : null,
  };
}

function toKpis(raw: Row): AdminPlatformKpis {
  const subscriptions = (raw.subscriptions ?? {}) as Row;
  const mrr = Array.isArray(raw.mrr) ? (raw.mrr as Row[]) : [];
  return {
    generatedAt: String(raw.generated_at ?? new Date().toISOString()),
    workspaces: num(raw.workspaces),
    workspacesNew7d: num(raw.workspaces_new_7d),
    users: num(raw.users),
    signups7d: num(raw.signups_7d),
    subscriptions: {
      active: num(subscriptions.active),
      trialing: num(subscriptions.trialing),
      past_due: num(subscriptions.past_due),
      canceled: num(subscriptions.canceled),
      none: num(subscriptions.none),
    },
    mrr: mrr.map((entry) => ({
      currency: String(entry.currency ?? "USD"),
      amountCents: num(entry.amount_cents),
      subscriptions: num(entry.subscriptions),
    })),
    trialsEnding3d: num(raw.trials_ending_3d),
    storageUsedBytes: num(raw.storage_used_bytes),
    storageProvisionedGb: num(raw.storage_provisioned_gb),
    storageHigh: num(raw.storage_high),
    deliveries: num(raw.deliveries),
    deliveries7d: num(raw.deliveries_7d),
    deliveries30d: num(raw.deliveries_30d),
    approvals7d: num(raw.approvals_7d),
    notificationsFailed24h: num(raw.notifications_failed_24h),
    commentBatchesOverdue: num(raw.comment_batches_overdue),
    waitlistPending: num(raw.waitlist_pending),
  };
}

/** "cl•••@example.com": enough to recognise an address in support, without showing it. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 2)}•••@${domain}`;
}

/** "+9715•••4567". */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9+]/g, "");
  if (digits.length <= 6) return "•••";
  return `${digits.slice(0, 5)}•••${digits.slice(-4)}`;
}

const PERIOD_MS = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000 } as const;

/** The scheduler should run every few minutes; quiet for longer than this means it isn't. */
const SCHEDULER_STALE_MS = 30 * 60_000;

/** How long WhatsApp comment alerts wait for the review session to go quiet. */
const WHATSAPP_QUIET_MS = COMMENT_QUIET_SECONDS * 1000;

/**
 * The admin panel's reads, on the service-role client. Each list is one database call (the
 * functions in 20261113120000_admin_read_model_and_audit.sql). Only build it through
 * getPlatformAdminServices(), after the platform-admin check.
 */
export class AdminReadModel {
  constructor(
    private readonly supabase: SupabaseClient,
    /** Times each query; getPlatformAdminServices() passes one tagged with the request ID. */
    private readonly log?: Logger
  ) {}

  async listWorkspaces(query: AdminWorkspaceQuery): Promise<AdminPage<AdminWorkspaceRow>> {
    return timedQuery(this.log, "listWorkspaces", async () => {
      const args = {
        p_search: query.search?.trim() || null,
        p_plan: query.plan || null,
        p_status: query.status || null,
        p_flag: query.flag || null,
        p_sort: query.sort ?? "created_at",
        p_desc: query.desc ?? true,
      };
      const rows = await this.rpcRows("admin_list_workspaces", {
        ...args,
        p_limit: query.pageSize,
        p_offset: (query.page - 1) * query.pageSize,
      });
      const total = rows.length > 0 || query.page === 1
        ? num(rows[0]?.total_count)
        : await this.totalOf("admin_list_workspaces", args);
      return { rows: rows.map(toWorkspaceRow), total, page: query.page, pageSize: query.pageSize };
    });
  }

  async getWorkspace(workspaceId: string): Promise<AdminWorkspaceRow | null> {
    return timedQuery(this.log, "getWorkspace", async () => {
      const rows = await this.rpcRows("admin_list_workspaces", { p_search: workspaceId, p_limit: 5 });
      const row = rows.find((candidate) => candidate.id === workspaceId);
      return row ? toWorkspaceRow(row) : null;
    });
  }

  async listUsers(query: AdminUserQuery): Promise<AdminPage<AdminUserRow>> {
    return timedQuery(this.log, "listUsers", async () => {
      const args = {
        p_search: query.search?.trim() || null,
        p_role: query.role || null,
        p_flag: query.flag || null,
        p_sort: query.sort ?? "created_at",
        p_desc: query.desc ?? true,
      };
      const rows = await this.rpcRows("admin_list_users", {
        ...args,
        p_limit: query.pageSize,
        p_offset: (query.page - 1) * query.pageSize,
      });
      const total = rows.length > 0 || query.page === 1
        ? num(rows[0]?.total_count)
        : await this.totalOf("admin_list_users", args);
      return { rows: rows.map(toUserRow), total, page: query.page, pageSize: query.pageSize };
    });
  }

  async getUser(userId: string): Promise<AdminUserRow | null> {
    return timedQuery(this.log, "getUser", async () => {
      const rows = await this.rpcRows("admin_list_users", { p_search: userId, p_limit: 5 });
      const row = rows.find((candidate) => candidate.id === userId);
      return row ? toUserRow(row) : null;
    });
  }

  async platformKpis(): Promise<AdminPlatformKpis> {
    return timedQuery(this.log, "platformKpis", async () => {
      const { data, error } = await this.supabase.rpc("admin_platform_kpis");
      if (error) throw new Error(`Couldn't load the platform numbers: ${error.message}`);
      return toKpis((data ?? {}) as Row);
    });
  }

  async listFailedNotifications(limit = 5): Promise<AdminFailedNotification[]> {
    return timedQuery(this.log, "listFailedNotifications", async () => {
      const { data, error } = await this.supabase
        .from("notification_logs")
        .select("id, workspace_id, channel, subject, error_message, created_at, workspaces(brand_name, slug)")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`Couldn't load failed notifications: ${error.message}`);
      return ((data ?? []) as Row[]).map((row) => {
        const workspace = (Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces) as Row | null;
        return {
          id: String(row.id),
          workspaceId: String(row.workspace_id),
          workspaceName: str(workspace?.brand_name),
          workspaceSlug: str(workspace?.slug),
          channel: row.channel === "whatsapp" ? "whatsapp" : "email",
          subject: str(row.subject),
          errorMessage: str(row.error_message),
          createdAt: String(row.created_at),
        };
      });
    });
  }

  async listWorkspaceDeliveries(workspaceId: string, limit = 50): Promise<AdminWorkspaceDelivery[]> {
    return timedQuery(this.log, "listWorkspaceDeliveries", async () => {
      const { data, error } = await this.supabase
        .from("view_workspace_deliveries_summary")
        .select("id, title, status, client_name, assets_count, comments_count, passcode_protected, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`Couldn't load the workspace's deliveries: ${error.message}`);
      return ((data ?? []) as Row[]).map((row) => ({
        id: String(row.id),
        title: String(row.title ?? ""),
        status: String(row.status ?? ""),
        clientName: str(row.client_name),
        assetsCount: num(row.assets_count),
        commentsCount: num(row.comments_count),
        passcodeProtected: Boolean(row.passcode_protected),
        createdAt: String(row.created_at),
      }));
    });
  }

  async listWorkspaceMembers(workspaceId: string): Promise<AdminWorkspaceMember[]> {
    return timedQuery(this.log, "listWorkspaceMembers", async () => {
      const { data, error } = await this.supabase
        .from("workspace_members")
        .select("user_id, role, joined_at")
        .eq("workspace_id", workspaceId)
        .order("joined_at", { ascending: true });
      if (error) throw new Error(`Couldn't load the workspace's members: ${error.message}`);

      const members = (data ?? []) as Row[];
      const userIds = members.map((member) => String(member.user_id));
      if (userIds.length === 0) return [];

      const [emails, profiles] = await Promise.all([
        new SupabaseAuthEmailLookup(this.supabase).emailsByUserId(userIds),
        this.supabase.from("user_profiles").select("id, full_name").in("id", userIds),
      ]);
      const names = new Map(((profiles.data ?? []) as Row[]).map((profile) => [String(profile.id), str(profile.full_name)]));

      return members.map((member) => {
        const userId = String(member.user_id);
        return {
          userId,
          email: emails.get(userId) ?? null,
          fullName: names.get(userId) ?? null,
          role: String(member.role ?? ""),
          joinedAt: str(member.joined_at),
        };
      });
    });
  }

  async listNotifications(query: AdminNotificationQuery): Promise<AdminPage<AdminNotificationRow>> {
    return timedQuery(this.log, "listNotifications", async () => {
      const from = (query.page - 1) * query.pageSize;
      let request = this.supabase
        .from("notification_logs")
        .select(
          "id, workspace_id, channel, status, recipient_email, recipient_phone, subject, error_message, created_at, workspaces(brand_name)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, from + query.pageSize - 1);
      if (query.channel) request = request.eq("channel", query.channel);
      if (query.status) request = request.eq("status", query.status);
      if (query.workspaceId) request = request.eq("workspace_id", query.workspaceId);
      if (query.period) request = request.gte("created_at", new Date(Date.now() - PERIOD_MS[query.period]).toISOString());

      const { data, error, count } = await request;
      if (error) throw new Error(`Couldn't load notifications: ${error.message}`);
      const rows = ((data ?? []) as Row[]).map((row) => {
        const workspace = (Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces) as Row | null;
        const channel = row.channel === "whatsapp" ? "whatsapp" : "email";
        return {
          id: String(row.id),
          workspaceId: String(row.workspace_id),
          workspaceName: str(workspace?.brand_name),
          channel,
          status: String(row.status ?? ""),
          recipient: channel === "whatsapp" ? maskPhone(str(row.recipient_phone)) : maskEmail(str(row.recipient_email)),
          subject: str(row.subject),
          errorMessage: str(row.error_message),
          createdAt: String(row.created_at),
        } satisfies AdminNotificationRow;
      });
      return { rows, total: count ?? 0, page: query.page, pageSize: query.pageSize };
    });
  }

  /** Client comments waiting to be sent to studios, by email (batched) and on WhatsApp. */
  async listPendingBatches(): Promise<AdminPendingBatch[]> {
    return timedQuery(this.log, "listPendingBatches", async () => {
      const [emails, whatsapp] = await Promise.all([
        this.supabase
          .from("comment_email_batches")
          .select("delivery_id, workspace_id, send_at, comment_count, deliveries(title), workspaces(brand_name)")
          .order("send_at", { ascending: true })
          .limit(50),
        this.supabase
          .from("whatsapp_comment_batches")
          .select("delivery_id, workspace_id, pending_count, last_comment_at, deliveries(title), workspaces(brand_name)")
          .gt("pending_count", 0)
          .order("last_comment_at", { ascending: true })
          .limit(50),
      ]);
      if (emails.error) throw new Error(`Couldn't load the email batches: ${emails.error.message}`);
      if (whatsapp.error) throw new Error(`Couldn't load the WhatsApp batches: ${whatsapp.error.message}`);

      const now = Date.now();
      const one = (value: unknown) => (Array.isArray(value) ? value[0] : value) as Row | null;
      const emailBatches = ((emails.data ?? []) as Row[]).map((row) => {
        const dueAt = str(row.send_at);
        return {
          kind: "email" as const,
          deliveryId: String(row.delivery_id),
          deliveryTitle: str(one(row.deliveries)?.title),
          workspaceId: String(row.workspace_id),
          workspaceName: str(one(row.workspaces)?.brand_name),
          comments: num(row.comment_count),
          dueAt,
          // Matches admin_platform_kpis(): still waiting 15 minutes after its window closed.
          overdue: dueAt !== null && new Date(dueAt).getTime() < now - 15 * 60_000,
        };
      });
      const whatsappBatches = ((whatsapp.data ?? []) as Row[]).map((row) => {
        const lastComment = str(row.last_comment_at);
        return {
          kind: "whatsapp" as const,
          deliveryId: String(row.delivery_id),
          deliveryTitle: str(one(row.deliveries)?.title),
          workspaceId: String(row.workspace_id),
          workspaceName: str(one(row.workspaces)?.brand_name),
          comments: num(row.pending_count),
          dueAt: lastComment,
          overdue: lastComment !== null && new Date(lastComment).getTime() < now - WHATSAPP_QUIET_MS - 15 * 60_000,
        };
      });
      return [...emailBatches, ...whatsappBatches];
    });
  }

  /** When /api/cron/notifications last ran. */
  async getScheduler(): Promise<AdminSchedulerStatus> {
    return timedQuery(this.log, "getScheduler", async () => {
      const { data, error } = await this.supabase
        .from("system_heartbeats")
        .select("last_started_at, last_finished_at, last_status, last_error")
        .eq("name", "notifications")
        .maybeSingle();
      if (error) throw new Error(`Couldn't read when the scheduler last ran: ${error.message}`);
      const row = (data ?? null) as Row | null;
      const lastFinishedAt = str(row?.last_finished_at);
      return {
        lastStartedAt: str(row?.last_started_at),
        lastFinishedAt,
        lastStatus: (str(row?.last_status) as AdminSchedulerStatus["lastStatus"]) ?? null,
        lastError: str(row?.last_error),
        stale: !lastFinishedAt || Date.now() - new Date(lastFinishedAt).getTime() > SCHEDULER_STALE_MS,
      };
    });
  }

  /** Byte totals of a workspace's files by kind (view_workspace_storage_breakdown). */
  async getStorageBreakdown(workspaceId: string): Promise<{ files: number; photoBytes: number; videoBytes: number } | null> {
    return timedQuery(this.log, "getStorageBreakdown", async () => {
      const { data, error } = await this.supabase
        .from("view_workspace_storage_breakdown")
        .select("total_assets, total_still_bytes, total_video_bytes")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw new Error(`Couldn't load the storage breakdown: ${error.message}`);
      if (!data) return null;
      const row = data as Row;
      return { files: num(row.total_assets), photoBytes: num(row.total_still_bytes), videoBytes: num(row.total_video_bytes) };
    });
  }

  /**
   * The ⌘K search: workspaces (name, slug, owner email or id), users (email, name or id) and
   * deliveries (exact share token, or title). A handful of each.
   */
  async search(term: string, limit = 5): Promise<AdminSearchResults> {
    return timedQuery(this.log, "search", async () => {
      const q = term.trim();
      // Wildcards and PostgREST syntax characters are dropped from the title match.
      const titleTerm = q.replace(/[%*_\\(),"]/g, " ").trim();
      const [workspaces, users, byToken, byTitle] = await Promise.all([
        this.rpcRows("admin_list_workspaces", { p_search: q, p_limit: limit }),
        this.rpcRows("admin_list_users", { p_search: q, p_limit: limit }),
        this.supabase
          .from("deliveries")
          .select("id, title, workspace_id, workspaces(brand_name)")
          .eq("share_token", q)
          .limit(1),
        titleTerm.length >= 2
          ? this.supabase
              .from("deliveries")
              .select("id, title, workspace_id, workspaces(brand_name)")
              .ilike("title", `%${titleTerm}%`)
              .order("created_at", { ascending: false })
              .limit(limit)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (byToken.error) throw new Error(`Couldn't search deliveries: ${byToken.error.message}`);
      if (byTitle.error) throw new Error(`Couldn't search deliveries: ${byTitle.error.message}`);

      const toDelivery = (row: Row, matchedShareToken: boolean) => {
        const workspace = (Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces) as Row | null;
        return {
          id: String(row.id),
          title: String(row.title ?? ""),
          workspaceId: String(row.workspace_id),
          workspaceName: str(workspace?.brand_name),
          matchedShareToken,
        };
      };
      const tokenMatches = ((byToken.data ?? []) as Row[]).map((row) => toDelivery(row, true));
      const titleMatches = ((byTitle.data ?? []) as Row[])
        .filter((row) => !tokenMatches.some((match) => match.id === String(row.id)))
        .map((row) => toDelivery(row, false));

      return {
        workspaces: workspaces.map((row) => ({
          id: String(row.id),
          name: String(row.brand_name ?? ""),
          slug: String(row.slug ?? ""),
          ownerEmail: str(row.owner_email),
        })),
        users: users.map((row) => ({ id: String(row.id), email: str(row.email), name: str(row.full_name) })),
        deliveries: [...tokenMatches, ...titleMatches].slice(0, limit),
      };
    });
  }

  /** Sign-ups, new workspaces, deliveries and approvals per UTC day, oldest first. */
  async dailySeries(days: number): Promise<AdminDailyPoint[]> {
    return timedQuery(this.log, "dailySeries", async () => {
      const rows = await this.rpcRows("admin_daily_series", { p_days: days });
      return rows.map((row) => ({
        day: String(row.day).slice(0, 10),
        signups: num(row.signups),
        workspaces: num(row.workspaces),
        deliveries: num(row.deliveries),
        approvals: num(row.approvals),
      }));
    });
  }

  /** List-price MRR per plan, largest first. */
  async mrrByPlan(): Promise<AdminPlanMrr[]> {
    return timedQuery(this.log, "mrrByPlan", async () => {
      const rows = await this.rpcRows("admin_mrr_by_plan", {});
      return rows.map((row) => ({
        planId: String(row.plan_id),
        planName: String(row.plan_name ?? ""),
        planSlug: String(row.plan_slug ?? ""),
        currency: String(row.currency ?? "USD"),
        amountCents: num(row.amount_cents),
        subscriptions: num(row.subscriptions),
      }));
    });
  }

  private async rpcRows(fn: string, args: Record<string, unknown>): Promise<Row[]> {
    const { data, error } = await this.supabase.rpc(fn, args);
    if (error) throw new Error(`Couldn't load ${fn.replace(/^admin_list_/, "")}: ${error.message}`);
    return (data ?? []) as Row[];
  }

  /** Total matches when the requested page is past the end (its rows can't carry the count). */
  private async totalOf(fn: string, args: Record<string, unknown>): Promise<number> {
    const rows = await this.rpcRows(fn, { ...args, p_limit: 1, p_offset: 0 });
    return num(rows[0]?.total_count);
  }
}
