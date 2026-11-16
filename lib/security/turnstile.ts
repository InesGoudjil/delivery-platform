import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ module: "turnstile" });

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Shown when a form's bot check fails or is missing. */
export const CAPTCHA_FAILED_MESSAGE = "Please complete the security check and try again.";

/**
 * Checks a Cloudflare Turnstile token from one of our own forms (waitlist, contact, inquiries,
 * partnerships). Sign-in, sign-up and reset tokens go to Supabase Auth instead, which checks them
 * itself. A token works only once, so never check one here that Supabase will also check.
 *
 * Without TURNSTILE_SECRET_KEY, every request passes (development). Once the key is set, a
 * missing token fails, and so does Cloudflare being unreachable.
 */
export async function verifyTurnstileToken(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "127.0.0.1") body.set("remoteip", ip);
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const outcome = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (outcome.success !== true) {
      log.info({ errorCodes: outcome["error-codes"] }, "Turnstile refused a token");
      return false;
    }
    return true;
  } catch (err) {
    log.warn({ err }, "Turnstile verification failed");
    return false;
  }
}
