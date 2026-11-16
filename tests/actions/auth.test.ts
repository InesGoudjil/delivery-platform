import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${url};307;` });
  }),
}));
vi.mock("@/lib/meta", () => ({ sendServerEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/posthog", () => ({ captureLogin: vi.fn(), captureSignup: vi.fn() }));

import { headers } from "next/headers";
import * as serverModule from "@/core/server";
import { loginAction, signupAction, requestPasswordResetAction } from "@/app/actions/auth";
import { InMemoryRatelimit } from "@/lib/upstash/ratelimit";

/**
 * app/actions/auth.ts: rate limits, the `redirect` field and the two-factor hand-off. The services
 * are fakes; finishSignIn (core/security/finish-sign-in.ts) runs for real on top of them.
 */

const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACME = { id: "ws-acme", slug: "acme" };

const plainUser = { id: USER_ID, email: "ann@test.example", factors: [], user_metadata: { full_name: "Ann" } };
const twoFactorUser = { ...plainUser, factors: [{ id: "f1", status: "verified", factor_type: "totp" }] };

function fakeServices() {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: plainUser, session: {} }, error: null }),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      getSessionIdentity: vi.fn().mockResolvedValue({ userId: USER_ID, sessionId: LOGIN }),
    },
    session: { registerSession: vi.fn().mockResolvedValue({ isRevoked: false }) },
    waitlist: { claimInvite: vi.fn().mockResolvedValue({}) },
    profile: { syncOAuthProfile: vi.fn().mockResolvedValue({}) },
    workspace: {
      getUserWorkspaces: vi.fn().mockResolvedValue([ACME]),
      getOrCreateWorkspace: vi.fn().mockResolvedValue(ACME),
    },
  };
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const login = (fields: Record<string, string> = {}) =>
  loginAction(null, form({ email: "ann@test.example", password: "correct horse", ...fields }));

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

describe("app/actions/auth", () => {
  let services: ReturnType<typeof fakeServices>;
  let adminServices: ReturnType<typeof fakeServices>;

  beforeEach(() => {
    vi.restoreAllMocks();
    InMemoryRatelimit.reset();
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7", host: "app.test" }));

    services = fakeServices();
    adminServices = fakeServices();
    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(services as any);
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(adminServices as any);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("loginAction", () => {
    it("goes to the user's workspace and records the device", async () => {
      expect(await redirectOf(login())).toBe("/acme");
      expect(services.session.registerSession).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, sessionTokenId: LOGIN, ipAddress: "203.0.113.7" })
      );
    });

    it("follows a same-site redirect, such as the invite the user came from", async () => {
      expect(await redirectOf(login({ redirect: "/invite/abc123" }))).toBe("/invite/abc123");
    });

    it("ignores a redirect that would leave the site", async () => {
      for (const redirect of ["//evil.example", "https://evil.example", "/\t/evil.example"]) {
        expect(await redirectOf(login({ redirect })), redirect).toBe("/acme");
        InMemoryRatelimit.reset();
      }
    });

    it("sends a user with an authenticator to /mfa, then on to where they were going", async () => {
      services.auth.signInWithPassword.mockResolvedValue({ data: { user: twoFactorUser, session: {} }, error: null });

      expect(await redirectOf(login())).toBe("/mfa?redirect=%2Facme");
      expect(await redirectOf(login({ redirect: "/invite/abc123" }))).toBe("/mfa?redirect=%2Finvite%2Fabc123");

      // Their aal1 session can't read their own rows (RLS), so the lookup uses the service role,
      // and nothing is created for them.
      expect(adminServices.workspace.getUserWorkspaces).toHaveBeenCalledWith(USER_ID);
      expect(services.workspace.getUserWorkspaces).not.toHaveBeenCalled();
      expect(services.workspace.getOrCreateWorkspace).not.toHaveBeenCalled();
      expect(services.session.registerSession).toHaveBeenCalled();
    });

    it("returns Supabase's error without redirecting", async () => {
      services.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      await expect(login()).resolves.toEqual({ error: "Invalid login credentials" });
    });

    it("allows 5 attempts per visitor and address in 15 minutes, then refuses without asking Supabase", async () => {
      services.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });
      for (let attempt = 0; attempt < 5; attempt++) await login();

      const refused = await login();
      expect(refused.error).toMatch(/Too many login attempts/);
      expect(services.auth.signInWithPassword).toHaveBeenCalledTimes(5);

      // Another address from the same visitor has its own count.
      await expect(login({ email: "bob@test.example" })).resolves.toEqual({ error: "Invalid login credentials" });
    });
  });

  describe("signupAction", () => {
    const signup = (fields: Record<string, string> = {}) =>
      signupAction(
        null,
        form({ name: "Ann Lee", email: "ann@test.example", password: "long-enough-1", "confirm-password": "long-enough-1", ...fields })
      );

    it("keeps the page to return to for the confirmation link, and claims the waitlist invite at once", async () => {
      services.auth.signUp.mockResolvedValue({
        data: { user: { ...plainUser, identities: [{ id: "i1" }] }, session: null },
        error: null,
      });

      const res = await signup({ redirect: "/invite/abc123", waitlist_token: "wl-token" });

      expect(res.success).toMatch(/Check your email/);
      expect(services.auth.signUp).toHaveBeenCalledWith("ann@test.example", "long-enough-1", "Ann Lee", {
        signupRedirect: "/invite/abc123",
        emailRedirectTo: "https://app.test/api/auth/callback?redirect=%2Finvite%2Fabc123",
      });
      expect(services.waitlist.claimInvite).toHaveBeenCalledWith("wl-token");
    });

    it("claims nothing when the address already has an account (Supabase returns a user without identities)", async () => {
      services.auth.signUp.mockResolvedValue({
        data: { user: { ...plainUser, identities: [] }, session: null },
        error: null,
      });

      await signup({ waitlist_token: "wl-token" });

      expect(services.waitlist.claimInvite).not.toHaveBeenCalled();
    });

    it("signs straight in when no confirmation is needed, to the requested page", async () => {
      services.auth.signUp.mockResolvedValue({
        data: { user: { ...plainUser, identities: [{ id: "i1" }] }, session: {} },
        error: null,
      });

      expect(await redirectOf(signup({ redirect: "/invite/abc123" }))).toBe("/invite/abc123");
      expect(services.session.registerSession).toHaveBeenCalled();
    });

    it("allows 5 sign-ups per visitor in 15 minutes", async () => {
      services.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "nope" } });
      for (let attempt = 0; attempt < 5; attempt++) await signup({ email: `n${attempt}@test.example` });

      const refused = await signup({ email: "n6@test.example" });
      expect(refused.error).toMatch(/Too many signup attempts/);
      expect(services.auth.signUp).toHaveBeenCalledTimes(5);
    });
  });

  describe("requestPasswordResetAction", () => {
    const reset = (email = "ann@test.example") => requestPasswordResetAction(null, form({ email }));

    it("limits reset emails per address, even when they come from different visitors", async () => {
      for (const ip of ["198.51.100.1", "198.51.100.2", "198.51.100.3"]) {
        vi.mocked(headers).mockResolvedValue(new Headers({ "x-forwarded-for": ip }));
        expect((await reset()).success).toBeTruthy();
      }

      vi.mocked(headers).mockResolvedValue(new Headers({ "x-forwarded-for": "198.51.100.4" }));
      expect((await reset()).error).toMatch(/Too many password reset requests/);
      expect(services.auth.resetPasswordForEmail).toHaveBeenCalledTimes(3);
    });

    it("limits a visitor across addresses", async () => {
      for (const email of ["a@test.example", "b@test.example", "c@test.example"]) await reset(email);

      expect((await reset("d@test.example")).error).toMatch(/Too many password reset requests/);
    });
  });
});
