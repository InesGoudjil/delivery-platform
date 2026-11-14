import type { SubscriptionStatus } from "@/core/entities/subscription";
import type { PlatformRole } from "@/core/entities/user-profile";

/** One page of an admin list, with the number of rows matching the filters across all pages. */
export interface AdminPage<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const ADMIN_PAGE_SIZES = [25, 50, 100] as const;

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export const ADMIN_WORKSPACE_SORTS = ["created_at", "brand_name", "storage", "deliveries", "last_activity"] as const;
export type AdminWorkspaceSort = (typeof ADMIN_WORKSPACE_SORTS)[number];

export const ADMIN_WORKSPACE_FLAGS = ["trial_ending", "storage_high", "overrides", "suspended"] as const;
export type AdminWorkspaceFlag = (typeof ADMIN_WORKSPACE_FLAGS)[number];

export const ADMIN_SUBSCRIPTION_FILTERS = ["active", "trialing", "past_due", "canceled", "none"] as const;
export type AdminSubscriptionFilter = (typeof ADMIN_SUBSCRIPTION_FILTERS)[number];

export interface AdminWorkspaceQuery {
  search?: string | null;
  /** A plan slug, or "none" for workspaces without a subscription. */
  plan?: string | null;
  status?: AdminSubscriptionFilter | null;
  flag?: AdminWorkspaceFlag | null;
  sort?: AdminWorkspaceSort;
  desc?: boolean;
  page: number;
  pageSize: number;
}

export interface AdminWorkspaceRow {
  id: string;
  brandName: string;
  slug: string;
  accountType: string;
  createdAt: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  planId: string | null;
  planName: string | null;
  planSlug: string | null;
  planPriceCents: number | null;
  planCurrency: string | null;
  planInterval: "month" | "year" | null;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  /** Billed through Stripe: plan changes must go through Stripe, or the webhook overwrites them. */
  stripeBilled: boolean;
  /** What the workspace actually gets: the subscribed plan while active or trialing, else Starter. */
  effectivePlanSlug: string | null;
  storageUsedBytes: number;
  /** Override, else the effective plan's limit. Null when neither says. */
  storageLimitGb: number | null;
  /** The storage_gb override, when there is one. */
  storageOverrideGb: number | null;
  deliveriesCount: number;
  activeDeliveriesCount: number;
  membersCount: number;
  lastActivityAt: string | null;
  hasOverrides: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const ADMIN_USER_SORTS = ["created_at", "email", "last_sign_in"] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];

export const ADMIN_USER_FLAGS = ["unconfirmed", "banned", "no_mfa"] as const;
export type AdminUserFlag = (typeof ADMIN_USER_FLAGS)[number];

export interface AdminUserQuery {
  search?: string | null;
  role?: PlatformRole | null;
  flag?: AdminUserFlag | null;
  sort?: AdminUserSort;
  desc?: boolean;
  page: number;
  pageSize: number;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  createdAt: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  mfaEnabled: boolean;
  ownedWorkspaces: number;
  memberships: number;
  primaryWorkspace: { id: string; name: string; slug: string } | null;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface AdminMrr {
  currency: string;
  /** List price per month, in the currency's minor unit. */
  amountCents: number;
  subscriptions: number;
}

export interface AdminPlatformKpis {
  generatedAt: string;
  workspaces: number;
  workspacesNew7d: number;
  users: number;
  signups7d: number;
  subscriptions: Record<AdminSubscriptionFilter, number>;
  mrr: AdminMrr[];
  trialsEnding3d: number;
  storageUsedBytes: number;
  storageProvisionedGb: number;
  storageHigh: number;
  deliveries: number;
  deliveries7d: number;
  deliveries30d: number;
  approvals7d: number;
  notificationsFailed24h: number;
  commentBatchesOverdue: number;
  waitlistPending: number;
}

export interface AdminFailedNotification {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  workspaceSlug: string | null;
  channel: "email" | "whatsapp";
  subject: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AdminWorkspaceDelivery {
  id: string;
  title: string;
  status: string;
  clientName: string | null;
  assetsCount: number;
  commentsCount: number;
  passcodeProtected: boolean;
  createdAt: string;
}

export interface AdminWorkspaceMember {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  joinedAt: string | null;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AdminAuditOutcome = "succeeded" | "failed";

export interface AdminAuditChanges {
  before?: unknown;
  after?: unknown;
}

export interface AdminAuditEvent {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  reason: string | null;
  outcome: AdminAuditOutcome;
  errorMessage: string | null;
  changes: AdminAuditChanges | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminAuditEventInput {
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  outcome: AdminAuditOutcome;
  errorMessage?: string | null;
  changes?: AdminAuditChanges | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AdminAuditQuery {
  action?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  actorId?: string | null;
  outcome?: AdminAuditOutcome | null;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// User page (B3)
// ---------------------------------------------------------------------------

export interface AdminUserFactor {
  id: string;
  friendlyName: string | null;
  factorType: string;
  status: "verified" | "unverified";
  createdAt: string | null;
}

export interface AdminUserMembership {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  isOwner: boolean;
  joinedAt: string | null;
}

export interface AdminUserSession {
  id: string;
  browser: string;
  os: string;
  deviceType: string;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  isRevoked: boolean;
  lastActiveAt: string;
  createdAt: string;
}

/** How long a ban lasts, as Supabase Auth durations. "indefinite" is 100 years. */
export const ADMIN_BAN_DURATIONS = {
  "24h": "24h",
  "7d": "168h",
  "30d": "720h",
  indefinite: "876000h",
} as const;
export type AdminBanDuration = keyof typeof ADMIN_BAN_DURATIONS;

export interface AdminSignOutResult {
  /** App session rows flagged revoked: those devices are turned away straight away. */
  revokedDevices: number;
  /** Supabase logins ended: their refresh tokens are gone. */
  endedLogins: number;
}

// ---------------------------------------------------------------------------
// Notifications (B5)
// ---------------------------------------------------------------------------

export const ADMIN_NOTIFICATION_PERIODS = ["24h", "7d", "30d"] as const;
export type AdminNotificationPeriod = (typeof ADMIN_NOTIFICATION_PERIODS)[number];

export interface AdminNotificationQuery {
  channel?: "email" | "whatsapp" | null;
  status?: "queued" | "sent" | "delivered" | "failed" | null;
  period?: AdminNotificationPeriod | null;
  workspaceId?: string | null;
  page: number;
  pageSize: number;
}

export interface AdminNotificationRow {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  channel: "email" | "whatsapp";
  status: string;
  /** Masked on the server: the full address never reaches the browser. */
  recipient: string | null;
  subject: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AdminPendingBatch {
  kind: "email" | "whatsapp";
  deliveryId: string;
  deliveryTitle: string | null;
  workspaceId: string;
  workspaceName: string | null;
  comments: number;
  /** Email: when the batch is due. WhatsApp: the last comment (it goes out after a quiet spell). */
  dueAt: string | null;
  overdue: boolean;
}

export interface AdminSchedulerStatus {
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastStatus: "running" | "ok" | "failed" | null;
  lastError: string | null;
  /** Never ran, or not for more than 30 minutes. */
  stale: boolean;
}

// ---------------------------------------------------------------------------
// Search (B6)
// ---------------------------------------------------------------------------

export interface AdminSearchResults {
  workspaces: { id: string; name: string; slug: string; ownerEmail: string | null }[];
  users: { id: string; email: string | null; name: string | null }[];
  deliveries: { id: string; title: string; workspaceId: string; workspaceName: string | null; matchedShareToken: boolean }[];
}

// ---------------------------------------------------------------------------
// Dashboard trends (B7)
// ---------------------------------------------------------------------------

export interface AdminDailyPoint {
  /** UTC day, YYYY-MM-DD. */
  day: string;
  signups: number;
  workspaces: number;
  deliveries: number;
  approvals: number;
}

export interface AdminPlanMrr {
  planId: string;
  planName: string;
  planSlug: string;
  currency: string;
  amountCents: number;
  subscriptions: number;
}
