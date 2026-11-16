/**
 * How long a client link may stay open, by plan.
 *
 * Every plan may give a link up to 30 days. Plans with extended link expiry (Pro and up) may also
 * pick a later date, or no expiry at all. The rule applies when a link is created or its expiry is
 * changed: links that already exist keep the expiry they have.
 *
 * Shared by the server actions (which enforce it) and the studio's screens (which lock the options).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The longest a link may stay open on every plan, and the default lifetime of new links. */
export const STANDARD_LINK_DAYS = 30;

/** No link is set to expire further out than this, on any plan. */
export const MAX_LINK_DAYS = 3650;

/** Room for the browser's clock (which picked the date) to run ahead of the server's. */
const CLOCK_SLACK_MS = DAY_MS;

export const EXTENDED_LINK_EXPIRY_MESSAGE =
  "Links that stay open longer than 30 days, or never expire, are available on Pro and Studio plans.";

/**
 * May this plan use links longer than 30 days? Plans whose features don't set
 * `extended_link_expiry` follow passcode protection, which is Pro and up.
 */
export function hasExtendedLinkExpiry(
  features: { extended_link_expiry?: boolean; password_protected?: boolean } | null | undefined
): boolean {
  if (!features) return false;
  return Boolean(features.extended_link_expiry ?? features.password_protected);
}

/** Why `expiresAt` can't be a link's expiry on any plan, or null. `null` means the link never expires. */
export function linkExpiryProblem(expiresAt: string | null, now: number = Date.now()): string | null {
  if (expiresAt === null) return null;
  const time = new Date(expiresAt).getTime();
  if (!Number.isFinite(time)) return "Pick a valid expiry date.";
  if (time <= now) return "Pick an expiry date in the future.";
  if (time > now + MAX_LINK_DAYS * DAY_MS + CLOCK_SLACK_MS) return "Pick an expiry date within the next 10 years.";
  return null;
}

/** True when the expiry needs extended link expiry: no expiry, or more than 30 days from now. */
export function isExtendedLinkExpiry(expiresAt: string | null, now: number = Date.now()): boolean {
  if (expiresAt === null) return true;
  return new Date(expiresAt).getTime() > now + STANDARD_LINK_DAYS * DAY_MS + CLOCK_SLACK_MS;
}

/** Both are the same moment, or both are "never". */
export function isSameLinkExpiry(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return new Date(a).getTime() === new Date(b).getTime();
}

/** Why `days` can't be the workspace's default link lifetime, or null. `null` means new links never expire. */
export function defaultLinkDaysProblem(days: number | null): string | null {
  if (days === null) return null;
  if (!Number.isInteger(days) || days < 1 || days > MAX_LINK_DAYS) {
    return `Pick a default between 1 and ${MAX_LINK_DAYS} days.`;
  }
  return null;
}

/** True when the default lifetime needs extended link expiry: never, or more than 30 days. */
export function isExtendedDefaultLinkDays(days: number | null): boolean {
  return days === null || days > STANDARD_LINK_DAYS;
}

/**
 * The expiry a new link gets from the workspace's default lifetime (`undefined`: nothing saved;
 * `null`: never), held to what the plan allows. A saved value that isn't a valid lifetime counts
 * as the standard 30 days.
 */
export function newLinkExpiresAt(
  defaultDays: number | null | undefined,
  extended: boolean,
  now: number = Date.now()
): string | null {
  let days: number | null = defaultDays === undefined ? STANDARD_LINK_DAYS : defaultDays;
  if (days !== null && defaultLinkDaysProblem(days)) days = STANDARD_LINK_DAYS;
  if (!extended && isExtendedDefaultLinkDays(days)) days = STANDARD_LINK_DAYS;
  return days === null ? null : new Date(now + days * DAY_MS).toISOString();
}
