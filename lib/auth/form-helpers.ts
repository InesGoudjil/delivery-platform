import { headers } from "next/headers";
import { checkRateLimit, type RatelimitPolicy } from "@/lib/upstash";
import { CAPTCHA_FAILED_MESSAGE } from "@/lib/security/turnstile";
import { createScopedLogger } from "@/lib/logger";

/** Helpers for the auth and account server actions (app/actions/auth.ts, app/actions/account.ts). */

const log = createScopedLogger({ module: "auth-form-helpers" });

/** This request's public origin (scheme and host), for links in emails. */
export async function requestOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * The message to show when `identifier` is over `policy`'s limit, or null. If the limiter itself
 * fails, the request goes through: an outage shouldn't lock everyone out.
 */
export async function rateLimitRefusal(policy: RatelimitPolicy, identifier: string[]): Promise<string | null> {
  try {
    const result = await checkRateLimit({ policy, identifier });
    return result.success ? null : result.error || "Too many attempts. Please try again later.";
  } catch (err) {
    log.warn({ err, policy: policy.keyPrefix }, "Rate limiter unavailable; letting the request through");
    return null;
  }
}

/** The Turnstile token the form sent (components/security/turnstile-widget.tsx), if any. */
export function captchaTokenFrom(formData: FormData): string | undefined {
  const token = formData.get("captcha_token");
  return typeof token === "string" && token !== "" ? token : undefined;
}

/** Supabase Auth's error code, when there is one (AuthError.code). */
export function authErrorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}

/** A message for a Supabase Auth error, in the app's words where its own isn't clear enough. */
export function authErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  switch (authErrorCode(error)) {
    case "captcha_failed":
      return CAPTCHA_FAILED_MESSAGE;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return "For your security, sign out and sign in again, then try once more.";
    case "email_exists":
      return "Another CineSpace account already uses that address.";
  }
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message !== "" ? message : fallback;
}
