import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import {
  ADMIN_NOTIFICATION_PERIODS,
  ADMIN_SUBSCRIPTION_FILTERS,
  ADMIN_USER_FLAGS,
  ADMIN_USER_SORTS,
  ADMIN_WORKSPACE_FLAGS,
  ADMIN_WORKSPACE_SORTS,
} from "@/core/admin/types";

/*
 * URL state of the admin lists, shared by the server pages (which load the data) and the client
 * tables (which change it). A filtered view survives a reload and can be shared as a link.
 * "nuqs/server" parsers work on both sides.
 */

const DIRECTIONS = ["asc", "desc"] as const;

/** Rows per page; mirrors ADMIN_PAGE_SIZES in core/admin/types.ts. */
export const PAGE_SIZE_OPTIONS = ["25", "50", "100"] as const;

export const listParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  size: parseAsStringLiteral(PAGE_SIZE_OPTIONS).withDefault("25"),
};

export const workspaceListParsers = {
  ...listParsers,
  plan: parseAsString.withDefault(""),
  status: parseAsStringLiteral(ADMIN_SUBSCRIPTION_FILTERS),
  flag: parseAsStringLiteral(ADMIN_WORKSPACE_FLAGS),
  sort: parseAsStringLiteral(ADMIN_WORKSPACE_SORTS).withDefault("created_at"),
  dir: parseAsStringLiteral(DIRECTIONS).withDefault("desc"),
};

export const userListParsers = {
  ...listParsers,
  role: parseAsStringLiteral(["admin", "user"] as const),
  flag: parseAsStringLiteral(ADMIN_USER_FLAGS),
  sort: parseAsStringLiteral(ADMIN_USER_SORTS).withDefault("created_at"),
  dir: parseAsStringLiteral(DIRECTIONS).withDefault("desc"),
};

export const auditListParsers = {
  page: listParsers.page,
  size: listParsers.size,
  action: parseAsString.withDefault(""),
  target: parseAsString.withDefault(""),
  actor: parseAsString.withDefault(""),
  outcome: parseAsStringLiteral(["succeeded", "failed"] as const),
};

export const notificationListParsers = {
  page: listParsers.page,
  size: listParsers.size,
  channel: parseAsStringLiteral(["email", "whatsapp"] as const),
  status: parseAsStringLiteral(["queued", "sent", "delivered", "failed"] as const),
  period: parseAsStringLiteral(ADMIN_NOTIFICATION_PERIODS),
  workspace: parseAsString.withDefault(""),
};

export const waitlistParsers = {
  page: listParsers.page,
  size: listParsers.size,
};

export const loadWorkspaceListParams = createLoader(workspaceListParsers);
export const loadUserListParams = createLoader(userListParsers);
export const loadAuditListParams = createLoader(auditListParsers);
export const loadWaitlistParams = createLoader(waitlistParsers);
export const loadNotificationListParams = createLoader(notificationListParsers);

/** An id from the URL, or null unless it looks like one (the database would reject anything else). */
export function idFrom(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
}

/** Page numbers from the URL are user input: never below 1. */
export function pageFrom(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}
