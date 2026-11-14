import type { AdminPlatformKpis } from "@/core/admin/types";

/*
 * The admin panel's sections. The sidebar and the dashboard's "Needs attention" list are built
 * from this list, so a new section is a folder under app/(admin)/admin/ plus one entry here.
 */

export type AdminIconName = "overview" | "workspaces" | "users" | "billing" | "waitlist" | "notifications" | "audit";

export type AdminNavGroup = "Overview" | "Customers" | "Billing" | "Growth" | "Operations" | "System";

export interface AdminModule {
  id: string;
  label: string;
  href: string;
  icon: AdminIconName;
  group: AdminNavGroup;
  /** How many things in this section need a look, from the dashboard numbers (no extra query). */
  attention?: (kpis: AdminPlatformKpis) => number;
}

export const ADMIN_MODULES: readonly AdminModule[] = [
  { id: "overview", label: "Overview", href: "/admin", icon: "overview", group: "Overview" },
  {
    id: "workspaces",
    label: "Workspaces",
    href: "/admin/workspaces",
    icon: "workspaces",
    group: "Customers",
    attention: (kpis) => kpis.subscriptions.past_due + kpis.trialsEnding3d + kpis.storageHigh,
  },
  { id: "users", label: "Users", href: "/admin/users", icon: "users", group: "Customers" },
  { id: "billing", label: "Plans & subscriptions", href: "/admin/subscriptions", icon: "billing", group: "Billing" },
  {
    id: "waitlist",
    label: "Waitlist",
    href: "/admin/waitlist",
    icon: "waitlist",
    group: "Growth",
    attention: (kpis) => kpis.waitlistPending,
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/admin/notifications",
    icon: "notifications",
    group: "Operations",
    attention: (kpis) => kpis.notificationsFailed24h + kpis.commentBatchesOverdue,
  },
  { id: "audit", label: "Audit log", href: "/admin/audit", icon: "audit", group: "System" },
];

/** Plain data for the client sidebar (functions and components can't cross to the client). */
export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: AdminIconName;
  group: AdminNavGroup;
  badge: number | null;
}

export function buildAdminNav(kpis: AdminPlatformKpis | null): AdminNavItem[] {
  return ADMIN_MODULES.map((module) => {
    const count = kpis && module.attention ? module.attention(kpis) : 0;
    return {
      id: module.id,
      label: module.label,
      href: module.href,
      icon: module.icon,
      group: module.group,
      badge: count > 0 ? count : null,
    };
  });
}
