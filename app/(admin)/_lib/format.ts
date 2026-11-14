/** Display helpers for the admin panel (English only, like the rest of the admin). */

const GB = 1024 ** 3;

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 100 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatGb(gb: number | null | undefined): string {
  if (gb === null || gb === undefined) return "—";
  if (gb < 0) return "Unlimited";
  return formatBytes(gb * GB);
}

/** Storage used as a share of the limit, 0–100, or null when there's no limit to compare with. */
export function storagePercent(usedBytes: number, limitGb: number | null): number | null {
  if (limitGb === null || limitGb <= 0) return null;
  return Math.min(100, Math.round((usedBytes / (limitGb * GB)) * 100));
}

export function formatMoney(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  if (amountMinor === null || amountMinor === undefined) return "—";
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(
      amountMinor / 100
    );
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${code}`;
  }
}

export function formatPlanPrice(
  priceCents: number | null | undefined,
  currency: string | null | undefined,
  interval: string | null | undefined
): string {
  if (!priceCents) return "Free";
  return `${formatMoney(priceCents, currency)}/${interval === "year" ? "yr" : "mo"}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 days ago", "in 2 hours", or the date when it's more than a month away. */
export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 31) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDate(value);
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
  none: "No subscription",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.change_role": "Changed platform role",
  "workspace.change_plan": "Changed plan",
  "workspace.override_features": "Changed feature overrides",
  "plan.create": "Created plan",
  "plan.update": "Edited plan",
  "plan.delete": "Deleted or archived plan",
  "waitlist.invite_cohort": "Invited waitlist cohort",
  "user.sign_out_everywhere": "Signed out everywhere",
  "user.ban": "Banned user",
  "user.unban": "Lifted ban",
  "user.reset_two_factor": "Reset two-factor sign-in",
  "workspace.suspend": "Suspended workspace",
  "workspace.unsuspend": "Lifted suspension",
};
