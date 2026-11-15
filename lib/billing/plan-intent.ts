/**
 * The paid plan a visitor picked on the landing page before they had an account.
 *
 * It's kept in a short-lived cookie so it survives every way of signing up (the signup form,
 * email confirmation, Google), and PlanIntentRedirect in the workspace layout then opens that
 * plan on the subscription page. The cookie only holds a plan slug.
 */
export const PLAN_INTENT_COOKIE = "cs_plan_intent";

/** A day: long enough to confirm an email address, short enough not to surprise anyone later. */
const MAX_AGE_SECONDS = 60 * 60 * 24;

const PLAN_SLUG_PATTERN = /^[a-z0-9-]{1,100}$/;

export function isPlanSlug(value: unknown): value is string {
  return typeof value === "string" && PLAN_SLUG_PATTERN.test(value);
}

/** Browser only. */
export function rememberPlanIntent(planSlug: string): void {
  if (!isPlanSlug(planSlug)) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${PLAN_INTENT_COOKIE}=${planSlug}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

/** Browser only. */
export function readPlanIntent(): string | null {
  const entry = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${PLAN_INTENT_COOKIE}=`));
  const value = entry ? decodeURIComponent(entry.slice(PLAN_INTENT_COOKIE.length + 1)) : null;
  return isPlanSlug(value) ? value : null;
}

/** Browser only. */
export function forgetPlanIntent(): void {
  document.cookie = `${PLAN_INTENT_COOKIE}=; Max-Age=0; Path=/`;
}
