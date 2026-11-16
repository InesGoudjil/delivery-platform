import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The routes Supabase Auth sends people back to: /api/auth/confirm (email links with a token hash)
 * and /api/auth/callback (Google, with a PKCE code). The Supabase client and the services are
 * fakes; finishSignIn runs for real on top of them.
 */

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import * as serverModule from "@/core/server";
import { GET as confirm } from "@/app/api/auth/confirm/route";
import { GET as callback } from "@/app/api/auth/callback/route";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACME = { id: "ws-acme", slug: "acme" };

const userWith = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: "ann@test.example",
  factors: [],
  user_metadata: { full_name: "Ann" },
  ...overrides,
});

function fakeServices() {
  return {
    session: { registerSession: vi.fn().mockResolvedValue({ isRevoked: false }) },
    waitlist: { claimInvite: vi.fn().mockResolvedValue({}) },
    profile: { syncOAuthProfile: vi.fn().mockResolvedValue({}) },
    workspace: {
      getUserWorkspaces: vi.fn().mockResolvedValue([ACME]),
      getOrCreateWorkspace: vi.fn().mockResolvedValue(ACME),
    },
  };
}

function fakeSupabase(result: { user?: unknown; error?: { message: string } | null }) {
  const auth = {
    verifyOtp: vi.fn().mockResolvedValue({
      data: { user: result.user ?? null, session: result.user ? {} : null },
      error: result.error ?? null,
    }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({
      data: { user: result.user ?? null, session: result.user ? {} : null },
      error: result.error ?? null,
    }),
    getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: USER_ID, session_id: LOGIN } }, error: null }),
  };
  mocks.createClient.mockResolvedValue({ auth });
  return auth;
}

const get = (path: string) => new Request(`http://localhost:3000${path}`);
const target = (res: Response) => {
  const url = new URL(res.headers.get("location")!);
  return url.pathname + url.search;
};

describe("auth return routes", () => {
  let services: ReturnType<typeof fakeServices>;
  let adminServices: ReturnType<typeof fakeServices>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.createClient.mockReset();
    services = fakeServices();
    adminServices = fakeServices();
    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(services as any);
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(adminServices as any);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("/api/auth/confirm", () => {
    it("checks a sign-up link, records the device and opens the workspace", async () => {
      const auth = fakeSupabase({ user: userWith() });

      const res = await confirm(get("/api/auth/confirm?token_hash=hash-1&type=email"));

      expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash-1", type: "email" });
      expect(target(res)).toBe("/acme");
      expect(services.session.registerSession).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, sessionTokenId: LOGIN })
      );
    });

    it("opens the page the person signed up from, kept in their metadata", async () => {
      fakeSupabase({ user: userWith({ user_metadata: { full_name: "Ann", signup_redirect: "/invite/abc123" } }) });

      const res = await confirm(get("/api/auth/confirm?token_hash=hash-1&type=email"));

      expect(target(res)).toBe("/invite/abc123");
    });

    it("ignores a stored or linked destination that would leave the site", async () => {
      fakeSupabase({ user: userWith({ user_metadata: { signup_redirect: "//evil.example" } }) });
      expect(target(await confirm(get("/api/auth/confirm?token_hash=h&type=email")))).toBe("/acme");

      fakeSupabase({ user: userWith() });
      expect(target(await confirm(get("/api/auth/confirm?token_hash=h&type=email_change&next=https://evil.example")))).toBe(
        "/acme"
      );
    });

    it("sends a password reset to /reset-password, whatever `next` says", async () => {
      fakeSupabase({ user: userWith() });

      const res = await confirm(get("/api/auth/confirm?token_hash=hash-1&type=recovery&next=/elsewhere"));

      expect(target(res)).toBe("/reset-password");
    });

    it("asks a user with an authenticator for their code first, the reset included", async () => {
      fakeSupabase({ user: userWith({ factors: [{ status: "verified" }] }) });

      const res = await confirm(get("/api/auth/confirm?token_hash=hash-1&type=recovery"));

      expect(target(res)).toBe("/mfa?redirect=%2Freset-password");
      expect(adminServices.workspace.getUserWorkspaces).toHaveBeenCalledWith(USER_ID);
    });

    it("sends expired, used or malformed links to /login with an explanation", async () => {
      fakeSupabase({ error: { message: "Email link is invalid or has expired" } });
      const expired = await confirm(get("/api/auth/confirm?token_hash=old&type=email"));
      expect(new URL(expired.headers.get("location")!).pathname).toBe("/login");
      expect(new URL(expired.headers.get("location")!).searchParams.get("error")).toMatch(/expired or was already used/);

      const auth = fakeSupabase({ user: userWith() });
      for (const path of ["/api/auth/confirm?type=email", "/api/auth/confirm?token_hash=h&type=sms"]) {
        const res = await confirm(get(path));
        expect(new URL(res.headers.get("location")!).pathname, path).toBe("/login");
      }
      expect(auth.verifyOtp).not.toHaveBeenCalled();
    });
  });

  describe("/api/auth/callback", () => {
    it("keeps working for Google: profile synced, invite or workspace next", async () => {
      fakeSupabase({ user: userWith({ user_metadata: { name: "Ann Lee", picture: "https://img.test/a.png" } }) });

      expect(target(await callback(get("/api/auth/callback?code=c1")))).toBe("/acme");
      expect(services.profile.syncOAuthProfile).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ fullName: "Ann Lee", avatarUrl: "https://img.test/a.png" })
      );

      fakeSupabase({ user: userWith() });
      expect(target(await callback(get("/api/auth/callback?code=c1&invite_token=tok1")))).toBe("/invite/tok1");

      fakeSupabase({ user: userWith() });
      expect(target(await callback(get("/api/auth/callback?code=c1&next=//evil.example")))).toBe("/acme");
    });

    it("sends Google users with an authenticator to /mfa", async () => {
      fakeSupabase({ user: userWith({ factors: [{ status: "verified" }] }) });

      expect(target(await callback(get("/api/auth/callback?code=c1&redirect=/studio/members")))).toBe(
        "/mfa?redirect=%2Fstudio%2Fmembers"
      );
      expect(adminServices.profile.syncOAuthProfile).toHaveBeenCalled();
      expect(services.profile.syncOAuthProfile).not.toHaveBeenCalled();
    });

    it("sends a failed exchange to /login with the error", async () => {
      fakeSupabase({ error: { message: "bad code" } });

      const res = await callback(get("/api/auth/callback?error=access_denied"));

      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
      expect(new URL(res.headers.get("location")!).searchParams.get("error")).toMatch(/cancelled/);
    });
  });
});
