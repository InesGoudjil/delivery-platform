import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${url};307;` });
  }),
}));

import { headers } from "next/headers";
import * as serverModule from "@/core/server";
import {
  acceptTermsAction,
  changeEmailAction,
  getAccountCredentialsAction,
  setPasswordAction,
} from "@/app/actions/account";
import { InMemoryRatelimit } from "@/lib/upstash/ratelimit";
import { TERMS_VERSION } from "@/lib/legal/terms";

/** app/actions/account.ts: the caller's own email address, password and Terms acceptance. */

const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const user = { id: USER_ID, email: "ann@test.example", new_email: null as string | null };

function fakeServices() {
  return {
    auth: {
      getCurrentUser: vi.fn().mockResolvedValue(user),
      getSessionIdentity: vi.fn().mockResolvedValue({ userId: USER_ID, sessionId: LOGIN }),
      updateUserPassword: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      requestEmailChange: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOutOthers: vi.fn().mockResolvedValue({ error: null }),
    },
    session: { revokeAllOtherSessions: vi.fn().mockResolvedValue([]) },
    profile: {
      hasPassword: vi.fn().mockResolvedValue(true),
      recordTermsAcceptance: vi.fn().mockResolvedValue(undefined),
    },
    workspace: { getUserWorkspaces: vi.fn().mockResolvedValue([{ id: "ws-acme", slug: "acme" }]) },
  };
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err: any) {
    if (typeof err?.digest === "string" && err.digest.startsWith("NEXT_REDIRECT")) return err.digest.split(";")[2];
    throw err;
  }
  throw new Error("Expected a redirect");
}

describe("app/actions/account", () => {
  let services: ReturnType<typeof fakeServices>;
  let adminServices: ReturnType<typeof fakeServices>;

  beforeEach(() => {
    vi.restoreAllMocks();
    InMemoryRatelimit.reset();
    vi.mocked(headers).mockResolvedValue(new Headers({ host: "app.test" }));
    services = fakeServices();
    adminServices = fakeServices();
    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(services as any);
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(adminServices as any);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("getAccountCredentialsAction", () => {
    it("returns the caller's email, a pending change and whether they have a password", async () => {
      services.auth.getCurrentUser.mockResolvedValue({ ...user, new_email: "new@test.example" });
      adminServices.profile.hasPassword.mockResolvedValue(false);

      await expect(getAccountCredentialsAction()).resolves.toEqual({
        success: true,
        data: { email: "ann@test.example", pendingEmail: "new@test.example", hasPassword: false },
      });
      // Read with the service role, for the caller's own id.
      expect(adminServices.profile.hasPassword).toHaveBeenCalledWith(USER_ID);
    });

    it("assumes a password when the status can't be read (migration not applied)", async () => {
      adminServices.profile.hasPassword.mockRejectedValue(new Error("function does not exist"));

      const res = await getAccountCredentialsAction();
      expect(res.success && res.data.hasPassword).toBe(true);
    });

    it("refuses signed-out callers", async () => {
      services.auth.getCurrentUser.mockResolvedValue(null);

      await expect(getAccountCredentialsAction()).resolves.toEqual({ success: false, error: "You must be signed in." });
    });
  });

  describe("setPasswordAction", () => {
    const setPassword = (fields: Record<string, string> = {}) =>
      setPasswordAction(null, form({ "new-password": "new password 22", "confirm-password": "new password 22", ...fields }));

    it("adds a password to an account that has none, and signs out the other devices", async () => {
      adminServices.profile.hasPassword.mockResolvedValue(false);

      const res = await setPassword();

      expect(res.success).toMatch(/Password set/);
      expect(services.auth.updateUserPassword).toHaveBeenCalledWith("new password 22");
      expect(services.session.revokeAllOtherSessions).toHaveBeenCalled();
      expect(services.auth.signOutOthers).toHaveBeenCalled();
    });

    it("refuses accounts that already have a password (they must give the current one)", async () => {
      adminServices.profile.hasPassword.mockResolvedValue(true);

      await expect(setPassword()).resolves.toEqual({
        error: "Your account already has a password. Change it with your current password.",
      });
      expect(services.auth.updateUserPassword).not.toHaveBeenCalled();
    });

    it("checks the new password before anything else", async () => {
      const res = await setPassword({ "new-password": "short", "confirm-password": "short" });

      expect(res.error).toMatch(/at least 10 characters/);
      expect(adminServices.profile.hasPassword).not.toHaveBeenCalled();
    });
  });

  describe("changeEmailAction", () => {
    const changeEmail = (email: string) => changeEmailAction(null, form({ email }));

    it("starts the change and says to open both links", async () => {
      const res = await changeEmail("new@test.example");

      expect(res.success).toMatch(/new@test\.example/);
      expect(services.auth.requestEmailChange).toHaveBeenCalledWith("new@test.example", "https://app.test/api/auth/callback");
    });

    it("refuses the current address and invalid ones", async () => {
      await expect(changeEmail("ANN@test.example")).resolves.toEqual({ error: "That's already your email address." });
      expect((await changeEmail("not-an-email")).error).toMatch(/valid email/);
      expect(services.auth.requestEmailChange).not.toHaveBeenCalled();
    });

    it("explains an address another account uses", async () => {
      services.auth.requestEmailChange.mockResolvedValue({
        data: { user: null },
        error: { message: "A user with this email address has already been registered", code: "email_exists" },
      });

      await expect(changeEmail("taken@test.example")).resolves.toEqual({
        error: "Another CineSpace account already uses that address.",
      });
    });

    it("allows 3 changes per hour", async () => {
      for (let attempt = 0; attempt < 3; attempt++) await changeEmail(`n${attempt}@test.example`);

      expect((await changeEmail("n4@test.example")).error).toMatch(/Too many email changes/);
      expect(services.auth.requestEmailChange).toHaveBeenCalledTimes(3);
    });
  });

  describe("acceptTermsAction", () => {
    it("records the current version with the service role, then continues", async () => {
      expect(await redirectOf(acceptTermsAction(form({ accept_terms: "on", redirect: "/invite/abc123" })))).toBe(
        "/invite/abc123"
      );
      expect(adminServices.profile.recordTermsAcceptance).toHaveBeenCalledWith(USER_ID, TERMS_VERSION);

      expect(await redirectOf(acceptTermsAction(form({ accept_terms: "on" })))).toBe("/acme");
    });

    it("sends the user back when the box isn't ticked", async () => {
      expect(await redirectOf(acceptTermsAction(form({ redirect: "/invite/abc123" })))).toBe(
        "/accept-terms?redirect=%2Finvite%2Fabc123&error=required"
      );
      expect(adminServices.profile.recordTermsAcceptance).not.toHaveBeenCalled();
    });

    it("never redirects off the site", async () => {
      expect(await redirectOf(acceptTermsAction(form({ accept_terms: "on", redirect: "//evil.example" })))).toBe("/acme");
    });

    it("sends signed-out visitors to sign in first", async () => {
      services.auth.getCurrentUser.mockResolvedValue(null);

      const target = await redirectOf(acceptTermsAction(form({ accept_terms: "on" })));
      expect(target.startsWith("/login?redirect=")).toBe(true);
      expect(adminServices.profile.recordTermsAcceptance).not.toHaveBeenCalled();
    });
  });
});
