/** Wording for share links in the studio's screens. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function shortDate(time: number): string {
  return new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", then the date. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "never";
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "never";
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  return shortDate(time);
}

/** "Never expires", "Expires today", "Expires in 3 days", "Expired Nov 12". */
export function expiryLabel(expiresAt: string | null | undefined, now: number = Date.now()): string {
  if (!expiresAt) return "Never expires";
  const time = new Date(expiresAt).getTime();
  if (!Number.isFinite(time)) return "Never expires";
  if (time <= now) return `Expired ${shortDate(time)}`;
  const days = Math.ceil((time - now) / DAY);
  if (time - now < DAY) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

/** True when the link expires within the next 7 days (and hasn't yet). */
export function expiresSoon(expiresAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return time > now && time - now <= 7 * DAY;
}

export function shareLinkUrl(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/deliver/${token}`;
}

export const ACTIVITY_LABELS: Record<string, string> = {
  open: "Opened",
  unlock: "Entered the passcode",
  unlock_failed: "Wrong passcode",
  download: "Downloaded a file",
  comment: "Commented",
  approve: "Approved",
};
