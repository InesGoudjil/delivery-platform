import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${url};307;` });
  }),
}));

import { cookies } from "next/headers";
import * as serverModule from "@/core/server";
import {
  getActiveSessionsAction,
  revokeSessionAction,
  revokeAllOtherSessionsAction,
} from "@/app/actions/sessions";
import { signOutAction } from "@/app/actions/auth";
import { SessionService } from "@/core/services/session.service";
import { AuthService } from "@/core/services/auth.service";
import type { UserSession } from "@/core/entities/user-session";
import { InMemoryUserSessionRepository } from "../services/in-memory-user-session-repository";

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";
const THIS_LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LAPTOP_LOGIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const THEIR_LOGIN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("app/actions/sessions and sign-out", () => {
  let table: InMemoryUserSessionRepository;
  let thisDevice: UserSession;
  let laptop: UserSession;
  let theirs: UserSession;
  let services: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    table = new InMemoryUserSessionRepository();
    thisDevice = table.addLogin(ME, THIS_LOGIN)!;
    laptop = table.addLogin(ME, LAPTOP_LOGIN)!;
    theirs = table.addLogin(SOMEONE_ELSE, THEIR_LOGIN)!;

    services = {
      auth: {
        getCurrentUser: vi.fn().mockResolvedValue({ id: ME }),
        getSessionIdentity: vi.fn().mockResolvedValue({ userId: ME, sessionId: THIS_LOGIN }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signOutOthers: vi.fn().mockResolvedValue({ error: null }),
      },
      session: new SessionService(table),
    };
    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(services);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  const signedOut = () => services.auth.getCurrentUser.mockResolvedValue(null);

  describe("getActiveSessionsAction", () => {
    it("lists the caller's devices, marks this one, and sends no session ids to the browser", async () => {
      const res = await getActiveSessionsAction();

      expect(res.success).toBe(true);
      expect(res.data?.map((d) => [d.id, d.isCurrent]).sort()).toEqual(
        [
          [thisDevice.id, true],
          [laptop.id, false],
        ].sort()
      );
      const sent = JSON.stringify(res);
      for (const sessionId of [THIS_LOGIN, LAPTOP_LOGIN, THEIR_LOGIN]) {
        expect(sent).not.toContain(sessionId);
      }
      for (const device of res.data!) {
        expect(device).not.toHaveProperty("sessionTokenId");
        expect(device).not.toHaveProperty("userId");
      }
    });

    it("records this device when its login has no row yet", async () => {
      table.rows = table.rows.filter((r) => r.id !== thisDevice.id);

      const res = await getActiveSessionsAction();

      const recorded = table.rows.find((r) => r.sessionTokenId === THIS_LOGIN);
      expect(recorded).toMatchObject({ userId: ME, isRevoked: false });
      expect(res.data?.find((d) => d.isCurrent)?.id).toBe(recorded!.id);
    });

    it("never brings a revoked login back", async () => {
      table.row(thisDevice.id)!.isRevoked = true;

      const res = await getActiveSessionsAction();

      expect(table.row(thisDevice.id)?.isRevoked).toBe(true);
      expect(res.data?.map((d) => d.id)).toEqual([laptop.id]);
    });

    it("refuses signed-out callers, and tokens that don't match the signed-in user", async () => {
      services.auth.getSessionIdentity.mockResolvedValue({ userId: SOMEONE_ELSE, sessionId: THEIR_LOGIN });
      expect(await getActiveSessionsAction()).toMatchObject({ success: false, data: [] });

      signedOut();
      expect(await getActiveSessionsAction()).toEqual({ success: false, error: "Unauthorized", data: [] });
    });
  });

  describe("revokeSessionAction", () => {
    it("signs another device of the caller out: flags its row and ends its Supabase login", async () => {
      expect(await revokeSessionAction(laptop.id)).toEqual({ success: true });

      expect(table.row(laptop.id)?.isRevoked).toBe(true);
      expect(table.endedAuthSessions).toEqual([{ userId: ME, sessionId: LAPTOP_LOGIN }]);
      expect(table.authSessions.has(LAPTOP_LOGIN)).toBe(false);
      expect(table.row(thisDevice.id)?.isRevoked).toBe(false);
    });

    it("can't revoke another user's session", async () => {
      expect(await revokeSessionAction(theirs.id)).toEqual({ success: false, error: "Session not found." });

      expect(table.row(theirs.id)?.isRevoked).toBe(false);
      expect(table.endedAuthSessions).toEqual([]);
      expect(table.authSessions.get(THEIR_LOGIN)).toBe(SOMEONE_ELSE);
    });

    it("refuses this device (sign out instead) and unknown ids", async () => {
      expect(await revokeSessionAction(thisDevice.id)).toMatchObject({ success: false });
      expect(await revokeSessionAction("not-a-row-id")).toEqual({ success: false, error: "Session not found." });

      expect(table.rows.every((r) => !r.isRevoked)).toBe(true);
      expect(table.endedAuthSessions).toEqual([]);
    });

    it("does nothing for signed-out callers", async () => {
      signedOut();
      expect(await revokeSessionAction(laptop.id)).toEqual({ success: false, error: "Unauthorized" });
      expect(table.row(laptop.id)?.isRevoked).toBe(false);
    });

    it("reports a failure to end the login without leaking details; the row stays flagged", async () => {
      table.endAuthSession = vi.fn().mockRejectedValue(new Error("Failed to end the login session: permission denied"));

      const res = await revokeSessionAction(laptop.id);

      expect(res.success).toBe(false);
      expect(res.error).not.toMatch(/permission denied/);
      expect(table.row(laptop.id)?.isRevoked).toBe(true);
    });
  });

  describe("revokeAllOtherSessionsAction", () => {
    it("flags the caller's other rows and ends every other login of theirs", async () => {
      const phone = table.addLogin(ME, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee")!;

      expect(await revokeAllOtherSessionsAction()).toEqual({ success: true });

      expect(table.row(laptop.id)?.isRevoked).toBe(true);
      expect(table.row(phone.id)?.isRevoked).toBe(true);
      expect(table.row(thisDevice.id)?.isRevoked).toBe(false);
      expect(table.row(theirs.id)?.isRevoked).toBe(false);
      expect(services.auth.signOutOthers).toHaveBeenCalledOnce();
    });

    it("reports a failed Supabase sign-out instead of claiming success", async () => {
      services.auth.signOutOthers.mockResolvedValue({ error: new Error("Auth server unavailable") });

      expect(await revokeAllOtherSessionsAction()).toMatchObject({ success: false });
      expect(table.row(laptop.id)?.isRevoked).toBe(true);
    });

    it("does nothing for signed-out callers or unverifiable sessions", async () => {
      services.auth.getSessionIdentity.mockResolvedValue(null);
      expect(await revokeAllOtherSessionsAction()).toMatchObject({ success: false });

      signedOut();
      expect(await revokeAllOtherSessionsAction()).toEqual({ success: false, error: "Unauthorized" });

      expect(table.rows.every((r) => !r.isRevoked)).toBe(true);
      expect(services.auth.signOutOthers).not.toHaveBeenCalled();
    });
  });

  describe("signOutAction", () => {
    it("signs this device out only: flags its row, ends its login and deletes the old tracking cookie", async () => {
      const cookieStore = await cookies();
      cookieStore.set("cinespace_sid", "legacy-id");

      await expect(signOutAction()).rejects.toMatchObject({ digest: expect.stringContaining(";/login;") });

      expect(table.row(thisDevice.id)?.isRevoked).toBe(true);
      expect(table.row(laptop.id)?.isRevoked).toBe(false);
      expect(services.auth.signOut).toHaveBeenCalledOnce();
      expect(services.auth.signOutOthers).not.toHaveBeenCalled();
      expect(cookieStore.delete).toHaveBeenCalledWith("cinespace_sid");
    });

    it("still signs out when the row can't be flagged", async () => {
      table.revokeByTokenId = vi.fn().mockRejectedValue(new Error("db down"));

      await expect(signOutAction()).rejects.toMatchObject({ digest: expect.stringContaining(";/login;") });
      expect(services.auth.signOut).toHaveBeenCalledOnce();
    });
  });
});

describe("core/services/AuthService session methods", () => {
  function authServiceWith(auth: Record<string, unknown>) {
    return new AuthService({ auth } as any, {} as any, {} as any);
  }

  it("signs out with the 'local' scope, so other devices stay signed in", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    await expect(authServiceWith({ signOut }).signOut()).resolves.toEqual({ error: null });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("signs the other devices out with the 'others' scope and reports errors", async () => {
    const failure = new Error("Auth server unavailable");
    const signOut = vi.fn().mockResolvedValue({ error: failure });
    await expect(authServiceWith({ signOut }).signOutOthers()).resolves.toEqual({ error: failure });
    expect(signOut).toHaveBeenCalledWith({ scope: "others" });

    const throwing = authServiceWith({ signOut: vi.fn().mockRejectedValue(failure) });
    await expect(throwing.signOut()).resolves.toEqual({ error: failure });
  });

  it("reads the current login from the verified access token", async () => {
    const getClaims = vi.fn().mockResolvedValue({ data: { claims: { sub: ME, session_id: THIS_LOGIN } }, error: null });
    await expect(authServiceWith({ getClaims }).getSessionIdentity()).resolves.toEqual({ userId: ME, sessionId: THIS_LOGIN });
  });
});
