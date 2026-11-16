import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  checkSetupLink,
  completeAccountSetup,
  findSetupLink,
  newSetupSecret,
  parseSetupToken,
  setupLinkUrl,
  setupToken,
  signInTokenFor,
  SETUP_CLAIM_KEY,
  SETUP_LINK_DAYS,
} from "@/core/security/account-setup";

/** Setup links for accounts the team makes (core/security/account-setup.ts). */

const USER_ID = "00000000-0000-4000-8000-0000000000c1";
const ISSUED = new Date("2026-11-16T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function userWith(secret: string, overrides: Record<string, unknown> = {}) {
  const claim = {
    token_hash: createHash("sha256").update(secret).digest("hex"),
    issued_at: ISSUED.toISOString(),
    expires_at: new Date(ISSUED.getTime() + SETUP_LINK_DAYS * DAY).toISOString(),
  };
  return {
    id: USER_ID,
    email: "karim@studio.test",
    app_metadata: { provider: "email", [SETUP_CLAIM_KEY]: claim },
    user_metadata: { full_name: "Karim Benali" },
    last_sign_in_at: null,
    banned_until: null,
    ...overrides,
  } as any;
}

/** A service-role client double for the Auth admin calls the module makes. */
function fakeAdmin(user: unknown) {
  return {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue(
          user ? { data: { user }, error: null } : { data: { user: null }, error: { status: 404, message: "User not found" } }
        ),
        updateUserById: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        generateLink: vi.fn().mockResolvedValue({ data: { properties: { hashed_token: "hashed-1" } }, error: null }),
      },
    },
  } as any;
}

describe("new setup links", () => {
  it("are long random secrets; only their hash is stored, with a 7-day expiry", () => {
    const { secret, claim } = newSetupSecret(ISSUED);
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(claim.token_hash).toBe(createHash("sha256").update(secret).digest("hex"));
    expect(claim.token_hash).not.toContain(secret);
    expect(claim.issued_at).toBe(ISSUED.toISOString());
    expect(Date.parse(claim.expires_at) - ISSUED.getTime()).toBe(7 * DAY);
    expect(newSetupSecret(ISSUED).secret).not.toBe(secret);
  });

  it("round-trip through the token and the /welcome link", () => {
    const { secret } = newSetupSecret();
    const token = setupToken(USER_ID, secret);
    expect(parseSetupToken(token)).toEqual({ userId: USER_ID, secret });
    expect(setupLinkUrl("https://cinespace.pro/", token)).toBe(`https://cinespace.pro/welcome/${token}`);
  });

  it.each([
    ["no dot", "abc"],
    ["not a user id", `not-a-uuid.${"a".repeat(43)}`],
    ["a short secret", `${USER_ID}.short`],
    ["characters outside base64url", `${USER_ID}.${"a".repeat(42)}%`],
    ["not a string", 42],
  ])("refuse a token with %s", (_label, token) => {
    expect(parseSetupToken(token)).toBeNull();
  });
});

describe("checkSetupLink", () => {
  const { secret } = newSetupSecret(ISSUED);
  const during = new Date(ISSUED.getTime() + DAY);

  it("accepts the right secret within the week, before anyone has signed in", () => {
    expect(checkSetupLink(userWith(secret), secret, during)).toMatchObject({ ok: true, email: "karim@studio.test" });
  });

  it("refuses the wrong secret", () => {
    expect(checkSetupLink(userWith(secret), newSetupSecret().secret, during)).toEqual({ ok: false, problem: "mismatch" });
  });

  it("refuses it once it has expired", () => {
    const after = new Date(ISSUED.getTime() + SETUP_LINK_DAYS * DAY + 1);
    expect(checkSetupLink(userWith(secret), secret, after)).toEqual({ ok: false, problem: "expired" });
  });

  it("refuses it once someone has signed in to the account after it was sent", () => {
    const signedIn = userWith(secret, { last_sign_in_at: new Date(ISSUED.getTime() + 60_000).toISOString() });
    expect(checkSetupLink(signedIn, secret, during)).toEqual({ ok: false, problem: "used" });
    // A sign-in before the link was sent (a resent link) doesn't count.
    const before = userWith(secret, { last_sign_in_at: new Date(ISSUED.getTime() - DAY).toISOString() });
    expect(checkSetupLink(before, secret, during).ok).toBe(true);
  });

  it("refuses it for a banned account", () => {
    const banned = userWith(secret, { banned_until: new Date(ISSUED.getTime() + 30 * DAY).toISOString() });
    expect(checkSetupLink(banned, secret, during)).toEqual({ ok: false, problem: "banned" });
  });

  it("refuses accounts without a link, and missing accounts", () => {
    expect(checkSetupLink(userWith(secret, { app_metadata: { provider: "email" } }), secret, during)).toEqual({
      ok: false,
      problem: "no_link",
    });
    expect(checkSetupLink(null, secret, during)).toEqual({ ok: false, problem: "not_found" });
  });
});

describe("findSetupLink", () => {
  const { secret } = newSetupSecret(ISSUED);
  const during = new Date(ISSUED.getTime() + DAY);

  it("doesn't call Supabase for a malformed token", async () => {
    const admin = fakeAdmin(userWith(secret));
    await expect(findSetupLink(admin, "junk", during)).resolves.toEqual({ ok: false, problem: "malformed" });
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("treats an unknown user as an unusable link", async () => {
    await expect(findSetupLink(fakeAdmin(null), setupToken(USER_ID, secret), during)).resolves.toEqual({
      ok: false,
      problem: "not_found",
    });
  });

  it("throws when Supabase can't be reached, so the page can say so", async () => {
    const admin = fakeAdmin(null);
    admin.auth.admin.getUserById.mockResolvedValue({ data: { user: null }, error: { status: 500, message: "upstream down" } });
    await expect(findSetupLink(admin, setupToken(USER_ID, secret), during)).rejects.toThrow("upstream down");
  });
});

describe("completeAccountSetup", () => {
  const { secret } = newSetupSecret(ISSUED);
  const during = new Date(ISSUED.getTime() + DAY);

  it("sets the password, confirms the email and removes the link in one update", async () => {
    const admin = fakeAdmin(userWith(secret));
    const result = await completeAccountSetup(admin, setupToken(USER_ID, secret), "a-long-password", during);
    expect(result).toEqual({ ok: true, userId: USER_ID, email: "karim@studio.test" });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledTimes(1);
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(USER_ID, {
      password: "a-long-password",
      email_confirm: true,
      app_metadata: { [SETUP_CLAIM_KEY]: null },
    });
  });

  it("changes nothing when the link doesn't work", async () => {
    const admin = fakeAdmin(userWith(secret));
    const result = await completeAccountSetup(admin, setupToken(USER_ID, newSetupSecret().secret), "a-long-password", during);
    expect(result).toEqual({ ok: false, problem: "mismatch" });
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it("passes on Supabase's password rules", async () => {
    const admin = fakeAdmin(userWith(secret));
    admin.auth.admin.updateUserById.mockResolvedValue({
      data: { user: null },
      error: { status: 422, code: "weak_password", message: "Password is known to be weak" },
    });
    await expect(completeAccountSetup(admin, setupToken(USER_ID, secret), "password123", during)).resolves.toEqual({
      ok: false,
      problem: "password_refused",
      message: "Password is known to be weak",
    });
  });
});

describe("signInTokenFor", () => {
  it("asks for a magic-link token without sending an email", async () => {
    const admin = fakeAdmin(null);
    await expect(signInTokenFor(admin, "karim@studio.test")).resolves.toBe("hashed-1");
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "karim@studio.test" });
  });

  it("fails loudly when Supabase refuses", async () => {
    const admin = fakeAdmin(null);
    admin.auth.admin.generateLink.mockResolvedValue({ data: { properties: null }, error: { message: "User not found" } });
    await expect(signInTokenFor(admin, "karim@studio.test")).rejects.toThrow("User not found");
  });
});
