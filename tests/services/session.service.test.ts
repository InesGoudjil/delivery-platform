import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  SessionService,
  isUuid,
  readSessionIdentity,
  sessionIdentityFromClaims,
  type SessionIdentity,
} from "@/core/services/session.service";
import type { IUserSessionRepository } from "@/core/repositories/user-session.repository";
import type { UserSession } from "@/core/entities/user-session";
import { InMemoryUserSessionRepository } from "./in-memory-user-session-repository";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "22222222-2222-4222-8222-222222222222";
const THIS_LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LAPTOP_LOGIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ROW_THIS = "c0000000-0000-4000-8000-000000000001";
const ROW_LAPTOP = "c0000000-0000-4000-8000-000000000002";

const current: SessionIdentity = { userId: USER, sessionId: THIS_LOGIN };

const device = {
  ipAddress: "203.0.113.7",
  browser: "Google Chrome",
  os: "macOS",
  deviceType: "desktop" as const,
  city: "Paris",
  country: "FR",
};

function row(overrides: Partial<UserSession> = {}): UserSession {
  return {
    id: ROW_LAPTOP,
    userId: USER,
    sessionTokenId: LAPTOP_LOGIN,
    ...device,
    isRevoked: false,
    lastActiveAt: "2026-11-10T09:00:00.000Z",
    createdAt: "2026-11-01T09:00:00.000Z",
    ...overrides,
  };
}

type MockRepo = { [K in keyof IUserSessionRepository]: Mock };

function mockRepo(): MockRepo {
  return {
    insertIfAbsent: vi.fn(),
    findByTokenId: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    listActiveByUserId: vi.fn().mockResolvedValue([]),
    revokeById: vi.fn().mockResolvedValue(null),
    revokeByTokenId: vi.fn().mockResolvedValue(null),
    revokeAllExcept: vi.fn().mockResolvedValue([]),
    touch: vi.fn().mockResolvedValue(true),
    endAuthSession: vi.fn().mockResolvedValue(true),
  };
}

describe("core/services/session.service", () => {
  describe("sessionIdentityFromClaims", () => {
    it("reads the user and the Supabase login from access-token claims", () => {
      expect(
        sessionIdentityFromClaims({ sub: USER.toUpperCase(), session_id: THIS_LOGIN, role: "authenticated" })
      ).toEqual({ userId: USER, sessionId: THIS_LOGIN });
    });

    it("rejects claims without a login id, or with ids that aren't UUIDs", () => {
      expect(sessionIdentityFromClaims({ sub: USER })).toBeNull();
      expect(sessionIdentityFromClaims({ sub: USER, session_id: "" })).toBeNull();
      expect(sessionIdentityFromClaims({ sub: "service_role", session_id: THIS_LOGIN })).toBeNull();
      expect(sessionIdentityFromClaims({ sub: USER, session_id: "cinespace-cookie-id" })).toBeNull();
      expect(sessionIdentityFromClaims(null)).toBeNull();
      expect(sessionIdentityFromClaims("token")).toBeNull();
    });

    it("validates UUIDs", () => {
      expect(isUuid(THIS_LOGIN)).toBe(true);
      expect(isUuid(`${THIS_LOGIN}x`)).toBe(false);
      expect(isUuid(42)).toBe(false);
    });
  });

  describe("readSessionIdentity", () => {
    it("reads the login from verified claims", async () => {
      const auth = { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: USER, session_id: THIS_LOGIN } }, error: null }) };
      await expect(readSessionIdentity(auth)).resolves.toEqual(current);
    });

    it("is null when signed out, when verification fails, or when getClaims throws", async () => {
      await expect(readSessionIdentity({ getClaims: vi.fn().mockResolvedValue({ data: null, error: null }) })).resolves.toBeNull();
      await expect(
        readSessionIdentity({ getClaims: vi.fn().mockResolvedValue({ data: null, error: new Error("Invalid JWT signature") }) })
      ).resolves.toBeNull();
      await expect(readSessionIdentity({ getClaims: vi.fn().mockRejectedValue(new Error("network")) })).resolves.toBeNull();
    });
  });

  describe("SessionService", () => {
    let repo: MockRepo;
    let service: SessionService;

    beforeEach(() => {
      repo = mockRepo();
      service = new SessionService(repo);
    });

    describe("registerSession", () => {
      const input = { userId: USER, sessionTokenId: THIS_LOGIN, ...device };

      it("records a new login", async () => {
        repo.insertIfAbsent.mockResolvedValue({ session: row({ id: ROW_THIS, sessionTokenId: THIS_LOGIN }), created: true });

        const session = await service.registerSession(input);

        expect(session.sessionTokenId).toBe(THIS_LOGIN);
        expect(repo.insertIfAbsent).toHaveBeenCalledWith(input);
        expect(repo.touch).not.toHaveBeenCalled();
      });

      it("never un-revokes: a revoked login stays revoked and its row isn't touched", async () => {
        repo.insertIfAbsent.mockResolvedValue({
          session: row({ id: ROW_THIS, sessionTokenId: THIS_LOGIN, isRevoked: true }),
          created: false,
        });

        const session = await service.registerSession(input);

        expect(session.isRevoked).toBe(true);
        expect(repo.touch).not.toHaveBeenCalled();
        expect(repo.revokeById).not.toHaveBeenCalled();
      });

      it("refreshes an active row that already exists", async () => {
        repo.insertIfAbsent.mockResolvedValue({ session: row({ id: ROW_THIS, sessionTokenId: THIS_LOGIN }), created: false });

        await service.registerSession(input);

        expect(repo.touch).toHaveBeenCalledWith(USER, THIS_LOGIN, device);
      });

      it("refuses a login id that is recorded for another account", async () => {
        repo.insertIfAbsent.mockResolvedValue(null);
        await expect(service.registerSession(input)).rejects.toThrow(/another account/);
      });

      it("doesn't swallow database errors", async () => {
        repo.insertIfAbsent.mockRejectedValue(new Error("Failed to record the user session: connection reset"));
        await expect(service.registerSession(input)).rejects.toThrow(/connection reset/);
      });

      it("keeps a revoked row revoked when the same login registers again (in-memory table)", async () => {
        const table = new InMemoryUserSessionRepository();
        const revoked = table.addRow({ userId: USER, sessionTokenId: THIS_LOGIN, isRevoked: true });
        const sessions = new SessionService(table);

        const session = await sessions.registerSession(input);

        expect(session.id).toBe(revoked.id);
        expect(session.isRevoked).toBe(true);
        expect(table.row(revoked.id)?.isRevoked).toBe(true);
        expect(table.rows).toHaveLength(1);
      });
    });

    describe("revokeSession", () => {
      it("flags the row, then ends the device's Supabase login", async () => {
        repo.findById.mockResolvedValue(row());
        repo.revokeById.mockResolvedValue(row({ isRevoked: true }));

        await expect(service.revokeSession(current, ROW_LAPTOP)).resolves.toBe("revoked");

        expect(repo.findById).toHaveBeenCalledWith(USER, ROW_LAPTOP);
        expect(repo.revokeById).toHaveBeenCalledWith(USER, ROW_LAPTOP);
        expect(repo.endAuthSession).toHaveBeenCalledWith(USER, LAPTOP_LOGIN);
        expect(repo.revokeById.mock.invocationCallOrder[0]).toBeLessThan(repo.endAuthSession.mock.invocationCallOrder[0]);
      });

      it("only looks within the caller's rows: another user's row is not found and nothing changes", async () => {
        const table = new InMemoryUserSessionRepository();
        const theirs = table.addLogin(OTHER_USER, LAPTOP_LOGIN)!;
        const sessions = new SessionService(table);

        await expect(sessions.revokeSession(current, theirs.id)).resolves.toBe("not_found");

        expect(table.row(theirs.id)?.isRevoked).toBe(false);
        expect(table.endedAuthSessions).toEqual([]);
        expect(table.authSessions.has(LAPTOP_LOGIN)).toBe(true);
      });

      it("refuses to revoke the device asking (it signs out instead)", async () => {
        repo.findById.mockResolvedValue(row({ id: ROW_THIS, sessionTokenId: THIS_LOGIN }));

        await expect(service.revokeSession(current, ROW_THIS)).resolves.toBe("current");
        expect(repo.revokeById).not.toHaveBeenCalled();
        expect(repo.endAuthSession).not.toHaveBeenCalled();
      });

      it("rejects ids that aren't UUIDs without querying", async () => {
        await expect(service.revokeSession(current, "1 or 1=1")).resolves.toBe("not_found");
        await expect(service.revokeSession(current, undefined as unknown as string)).resolves.toBe("not_found");
        expect(repo.findById).not.toHaveBeenCalled();
      });

      it("is not found when the row disappears between the lookup and the update", async () => {
        repo.findById.mockResolvedValue(row());
        repo.revokeById.mockResolvedValue(null);

        await expect(service.revokeSession(current, ROW_LAPTOP)).resolves.toBe("not_found");
        expect(repo.endAuthSession).not.toHaveBeenCalled();
      });

      it("doesn't try to end a login for a row keyed on something other than a session id", async () => {
        repo.findById.mockResolvedValue(row({ sessionTokenId: "legacy-cookie-id" }));
        repo.revokeById.mockResolvedValue(row({ sessionTokenId: "legacy-cookie-id", isRevoked: true }));

        await expect(service.revokeSession(current, ROW_LAPTOP)).resolves.toBe("revoked");
        expect(repo.endAuthSession).not.toHaveBeenCalled();
      });

      it("reports a failure to end the login (the row stays flagged, so the middleware still turns it away)", async () => {
        repo.findById.mockResolvedValue(row());
        repo.revokeById.mockResolvedValue(row({ isRevoked: true }));
        repo.endAuthSession.mockRejectedValue(new Error("Failed to end the login session: permission denied"));

        await expect(service.revokeSession(current, ROW_LAPTOP)).rejects.toThrow(/permission denied/);
        expect(repo.revokeById).toHaveBeenCalledOnce();
      });
    });

    it("revokes every other row of the caller, keeping this login", async () => {
      repo.revokeAllExcept.mockResolvedValue([row({ isRevoked: true })]);

      const revoked = await service.revokeAllOtherSessions(current);

      expect(repo.revokeAllExcept).toHaveBeenCalledWith(USER, THIS_LOGIN);
      expect(revoked).toHaveLength(1);
    });

    it("flags this login's row on sign-out", async () => {
      repo.revokeByTokenId.mockResolvedValueOnce(row({ id: ROW_THIS, sessionTokenId: THIS_LOGIN, isRevoked: true }));
      await expect(service.markSignedOut(current)).resolves.toBe(true);
      expect(repo.revokeByTokenId).toHaveBeenCalledWith(USER, THIS_LOGIN);

      await expect(service.markSignedOut(current)).resolves.toBe(false);
    });

    it("lists the caller's active sessions and looks up a login's row", async () => {
      repo.listActiveByUserId.mockResolvedValue([row()]);
      repo.findByTokenId.mockResolvedValue(row({ id: ROW_THIS, sessionTokenId: THIS_LOGIN }));

      await expect(service.listActiveSessions(USER)).resolves.toHaveLength(1);
      expect(repo.listActiveByUserId).toHaveBeenCalledWith(USER);
      await expect(service.getSession(current)).resolves.toMatchObject({ id: ROW_THIS });
      expect(repo.findByTokenId).toHaveBeenCalledWith(USER, THIS_LOGIN);
    });
  });
});
