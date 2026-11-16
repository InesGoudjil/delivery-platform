import { createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${url};307;` });
  }),
}));

const supabase = { auth: { getClaims: vi.fn(), verifyOtp: vi.fn() } };
const admin = { auth: { admin: { getUserById: vi.fn(), updateUserById: vi.fn(), generateLink: vi.fn() } } };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabase),
  createServiceRoleClient: vi.fn(() => admin),
}));

const finishSignIn = vi.fn();
vi.mock("@/core/security/finish-sign-in", () => ({ finishSignIn: (...args: unknown[]) => finishSignIn(...args) }));

const signOutCurrentSession = vi.fn();
vi.mock("@/lib/session-manager", () => ({ signOutCurrentSession: (...args: unknown[]) => signOutCurrentSession(...args) }));

vi.mock("@/core/server", () => ({ getServerServices: vi.fn(async () => ({ auth: {}, session: {} })) }));

const checkRateLimit = vi.fn();
vi.mock("@/lib/upstash/assert-rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
  getClientIp: vi.fn(async () => "203.0.113.7"),
}));

import { completeAccountSetupAction } from "@/app/actions/account-setup";
import { SETUP_CLAIM_KEY, SETUP_LINK_UNUSABLE_MESSAGE } from "@/core/security/account-setup";

/**
 * app/actions/account-setup.ts: the /welcome form. The setup-link checks in
 * core/security/account-setup.ts run for real on a Supabase double.
 */

const USER_ID = "00000000-0000-4000-8000-0000000000c1";
const OTHER_USER = "00000000-0000-4000-8000-0000000000f1";
const LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECRET = "s".repeat(43);
const TOKEN = `${USER_ID}.${SECRET}`;
const PASSWORD = "a long enough password";

const newUser = {
  id: USER_ID,
  email: "karim@studio.test",
  user_metadata: { full_name: "Karim Benali" },
  app_metadata: {
    provider: "email",
    [SETUP_CLAIM_KEY]: {
      token_hash: createHash("sha256").update(SECRET).digest("hex"),
      issued_at: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  last_sign_in_at: null,
  banned_until: null,
};

function form(fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries({
    token: TOKEN,
    password: PASSWORD,
    "confirm-password": PASSWORD,
    ...fields,
  })) {
    data.set(name, value);
  }
  return data;
}

/** Where the action redirected to (Next's redirect() throws). */
async function redirectOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err: any) {
    if (typeof err?.digest === "string" && err.digest.startsWith("NEXT_REDIRECT")) return err.digest.split(";")[2];
    throw err;
  }
  throw new Error("Expected a redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimit.mockResolvedValue({ success: true });
  admin.auth.admin.getUserById.mockResolvedValue({ data: { user: newUser }, error: null });
  admin.auth.admin.updateUserById.mockResolvedValue({ data: { user: newUser }, error: null });
  admin.auth.admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "hashed-1" } }, error: null });
  // Nobody signed in on this browser, until the sign-in below.
  supabase.auth.getClaims.mockResolvedValue({ data: null, error: null });
  supabase.auth.verifyOtp.mockImplementation(async () => {
    supabase.auth.getClaims.mockResolvedValue({ data: { claims: { sub: USER_ID, session_id: LOGIN } }, error: null });
    return { data: { user: newUser, session: {} }, error: null };
  });
  finishSignIn.mockResolvedValue({ redirectTo: "/benali-films", workspace: null, needsTwoFactor: false });
});

describe("completeAccountSetupAction", () => {
  it("sets the password, signs the browser in and opens their workspace", async () => {
    await expect(redirectOf(completeAccountSetupAction(null, form()))).resolves.toBe("/benali-films");

    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(USER_ID, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { [SETUP_CLAIM_KEY]: null },
    });
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "karim@studio.test" });
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "hashed-1", type: "magiclink" });
    expect(finishSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ user: newUser, identity: { userId: USER_ID, sessionId: LOGIN }, requestedPath: "/" })
    );
    expect(signOutCurrentSession).not.toHaveBeenCalled();
  });

  it("signs out whoever else was signed in on this browser first", async () => {
    supabase.auth.getClaims.mockResolvedValue({ data: { claims: { sub: OTHER_USER, session_id: LOGIN } }, error: null });
    await redirectOf(completeAccountSetupAction(null, form()));
    expect(signOutCurrentSession).toHaveBeenCalledTimes(1);
    expect(signOutCurrentSession.mock.invocationCallOrder[0]).toBeLessThan(supabase.auth.verifyOtp.mock.invocationCallOrder[0]);
  });

  it("changes nothing for a link that doesn't work", async () => {
    const result = await completeAccountSetupAction(null, form({ token: `${USER_ID}.${"x".repeat(43)}` }));
    expect(result).toEqual({ error: SETUP_LINK_UNUSABLE_MESSAGE, linkUnusable: true });
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("checks the password before touching the account", async () => {
    const result = await completeAccountSetupAction(null, form({ "confirm-password": "something else entirely" }));
    expect(result.error).toBeTruthy();
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("is rate limited per IP", async () => {
    checkRateLimit.mockResolvedValue({ success: false, error: "Too many login attempts. Please try again in 15 minutes." });
    const result = await completeAccountSetupAction(null, form());
    expect(result).toEqual({ error: "Too many login attempts. Please try again in 15 minutes." });
    expect(checkRateLimit).toHaveBeenCalledWith(expect.objectContaining({ identifier: ["203.0.113.7", "account-setup"] }));
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("sends them to sign in when the password is saved but the sign-in fails", async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Token has expired" } });
    const result = await completeAccountSetupAction(null, form());
    expect(result).toMatchObject({ passwordSet: true });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalled();
  });
});
