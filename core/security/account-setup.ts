import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/*
 * Setup links for accounts a platform admin creates (Admin → Users → New client).
 *
 * The person has an account but no password. Their link opens /welcome/<token>, where they choose
 * a password and are signed in. It's our own link, not a Supabase email link: those expire with
 * the project's email OTP setting (an hour by default), too soon for someone who reads the email
 * the next day.
 *
 * - The token is "<user id>.<secret>". Only the SHA-256 hash of the secret is stored, in the
 *   user's app_metadata, which only the service role can write.
 * - A link works once, for SETUP_LINK_DAYS days, and only until someone signs in to the account.
 *   Issuing a new link replaces the old one.
 */

export const SETUP_LINK_DAYS = 7;

/** The app_metadata key that holds the current link's hash. */
export const SETUP_CLAIM_KEY = "account_setup";

/** One message for every link that can't be used, so the page doesn't say whether an account exists. */
export const SETUP_LINK_UNUSABLE_MESSAGE =
  "This link has expired or was already used. Sign in, or use \"Forgot password\" on the sign-in page.";

export interface SetupClaim {
  token_hash: string;
  issued_at: string;
  expires_at: string;
}

export type SetupLinkProblem = "malformed" | "not_found" | "no_link" | "mismatch" | "expired" | "used" | "banned";

export type SetupLinkCheck = { ok: true; user: User; email: string } | { ok: false; problem: SetupLinkProblem };

const SECRET_BYTES = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = /^[A-Za-z0-9_-]{43}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** A new secret and the claim to store for it. The token is built once the user id is known. */
export function newSetupSecret(now = new Date()): { secret: string; claim: SetupClaim } {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  return {
    secret,
    claim: {
      token_hash: hashSecret(secret),
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + SETUP_LINK_DAYS * DAY_MS).toISOString(),
    },
  };
}

export function setupToken(userId: string, secret: string): string {
  return `${userId}.${secret}`;
}

/** The link to email or share: `origin` is the app's public origin, without a trailing slash. */
export function setupLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/welcome/${token}`;
}

export function parseSetupToken(token: unknown): { userId: string; secret: string } | null {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const userId = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  return UUID.test(userId) && SECRET.test(secret) ? { userId: userId.toLowerCase(), secret } : null;
}

/** The user's current setup claim, if it's well formed. */
export function readSetupClaim(user: Pick<User, "app_metadata">): SetupClaim | null {
  const claim = (user.app_metadata as Record<string, unknown> | undefined)?.[SETUP_CLAIM_KEY];
  if (!claim || typeof claim !== "object") return null;
  const { token_hash, issued_at, expires_at } = claim as Record<string, unknown>;
  if (typeof token_hash !== "string" || !/^[0-9a-f]{64}$/.test(token_hash)) return null;
  if (typeof issued_at !== "string" || Number.isNaN(Date.parse(issued_at))) return null;
  if (typeof expires_at !== "string" || Number.isNaN(Date.parse(expires_at))) return null;
  return { token_hash, issued_at, expires_at };
}

/** Whether `secret` opens this user's setup link right now. No I/O, so it's easy to test. */
export function checkSetupLink(user: User | null, secret: string, now = new Date()): SetupLinkCheck {
  if (!user || !user.email) return { ok: false, problem: "not_found" };
  const claim = readSetupClaim(user);
  if (!claim) return { ok: false, problem: "no_link" };

  const expected = Buffer.from(claim.token_hash, "hex");
  const actual = Buffer.from(hashSecret(secret), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { ok: false, problem: "mismatch" };

  if (Date.parse(claim.expires_at) <= now.getTime()) return { ok: false, problem: "expired" };
  // Someone signed in after the link was sent (with Google, say): the account is in use.
  if (user.last_sign_in_at && Date.parse(user.last_sign_in_at) >= Date.parse(claim.issued_at)) {
    return { ok: false, problem: "used" };
  }
  if (user.banned_until && Date.parse(user.banned_until) > now.getTime()) return { ok: false, problem: "banned" };
  return { ok: true, user, email: user.email };
}

/**
 * Looks up the account a setup token belongs to and checks the link. `admin` must be a
 * service-role client. Throws only when Supabase can't be reached.
 */
export async function findSetupLink(admin: SupabaseClient, token: unknown, now = new Date()): Promise<SetupLinkCheck> {
  const parsed = parseSetupToken(token);
  if (!parsed) return { ok: false, problem: "malformed" };
  const { data, error } = await admin.auth.admin.getUserById(parsed.userId);
  if (error) {
    if (error.status === 404 || /not found/i.test(error.message)) return { ok: false, problem: "not_found" };
    throw new Error(`Couldn't check the setup link: ${error.message}`);
  }
  return checkSetupLink(data.user ?? null, parsed.secret, now);
}

export type SetupCompletion =
  | { ok: true; userId: string; email: string }
  | { ok: false; problem: SetupLinkProblem }
  | { ok: false; problem: "password_refused"; message: string };

/**
 * Uses a setup link: sets the password, confirms the email (the link proves the inbox is theirs)
 * and removes the link, in one update. Signing the browser in is the caller's job.
 */
export async function completeAccountSetup(
  admin: SupabaseClient,
  token: unknown,
  password: string,
  now = new Date()
): Promise<SetupCompletion> {
  const check = await findSetupLink(admin, token, now);
  if (check.ok === false) return { ok: false, problem: check.problem };

  const { error } = await admin.auth.admin.updateUserById(check.user.id, {
    password,
    email_confirm: true,
    // GoTrue deletes app_metadata keys set to null.
    app_metadata: { [SETUP_CLAIM_KEY]: null },
  });
  if (error) {
    if (error.code === "weak_password" || (error.status === 422 && /password/i.test(error.message))) {
      return { ok: false, problem: "password_refused", message: error.message || "Choose a stronger password." };
    }
    throw new Error(`Couldn't set the password: ${error.message}`);
  }
  return { ok: true, userId: check.user.id, email: check.email };
}

/**
 * A one-time sign-in token for `email`, to pass to verifyOtp({ type: "magiclink" }) on the
 * browser's own client. Nothing is emailed. Unlike a password sign-in, it isn't held up by the
 * CAPTCHA check.
 */
export async function signInTokenFor(admin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) throw new Error(`Couldn't start the sign-in: ${error?.message ?? "no token returned"}`);
  return hashed;
}
