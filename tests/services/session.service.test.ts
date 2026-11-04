import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionService } from "@/core/services/session.service";
import type { IUserSessionRepository } from "@/core/repositories/user-session.repository";
import type { UserSession } from "@/core/entities/user-session";

describe("core/services/SessionService", () => {
  let sessionRepo: IUserSessionRepository;
  let service: SessionService;

  const mockSession: UserSession = {
    id: "sess_123",
    userId: "user_456",
    sessionTokenId: "token_abc",
    ipAddress: "192.168.1.50",
    browser: "Google Chrome",
    os: "macOS",
    deviceType: "desktop",
    city: "San Francisco",
    country: "US",
    isRevoked: false,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    sessionRepo = {
      upsertSession: vi.fn().mockResolvedValue(mockSession),
      listActiveByUserId: vi.fn().mockResolvedValue([mockSession]),
      findByTokenId: vi.fn().mockResolvedValue(mockSession),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      revokeAllOtherSessions: vi.fn().mockResolvedValue(undefined),
      updateLastActive: vi.fn().mockResolvedValue(undefined),
    };

    service = new SessionService(sessionRepo);
  });

  it("registers or updates a user device session", async () => {
    const session = await service.registerSession({
      userId: "user_456",
      sessionTokenId: "token_abc",
      browser: "Google Chrome",
      os: "macOS",
      deviceType: "desktop",
      ipAddress: "192.168.1.50",
      city: "San Francisco",
      country: "US",
    });

    expect(session.id).toBe("sess_123");
    expect(session.browser).toBe("Google Chrome");
    expect(sessionRepo.upsertSession).toHaveBeenCalledOnce();
  });

  it("lists all active sessions for a user", async () => {
    const list = await service.listActiveSessions("user_456");
    expect(list).toHaveLength(1);
    expect(list[0].sessionTokenId).toBe("token_abc");
    expect(sessionRepo.listActiveByUserId).toHaveBeenCalledWith("user_456");
  });

  it("revokes a specific session", async () => {
    await service.revokeSession("sess_123", "user_456");
    expect(sessionRepo.revokeSession).toHaveBeenCalledWith("sess_123", "user_456");
  });

  it("revokes all other sessions except current device", async () => {
    await service.revokeAllOtherSessions("user_456", "token_abc");
    expect(sessionRepo.revokeAllOtherSessions).toHaveBeenCalledWith("user_456", "token_abc");
  });

  it("touches session last_active_at", async () => {
    await service.touchSession("token_abc");
    expect(sessionRepo.updateLastActive).toHaveBeenCalledWith("token_abc");
  });
});
