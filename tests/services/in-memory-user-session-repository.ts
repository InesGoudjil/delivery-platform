import { randomUUID } from "node:crypto";
import type {
  DeviceDetails,
  IUserSessionRepository,
  InsertSessionResult,
  NewUserSession,
} from "@/core/repositories/user-session.repository";
import type { UserSession } from "@/core/entities/user-session";

/**
 * user_sessions in memory, with the same rules as SupabaseUserSessionRepository: every method is
 * scoped to one user, inserts never touch an existing row, and session ids are unique across
 * users. `authSessions` stands in for auth.sessions (session id -> user id).
 */
export class InMemoryUserSessionRepository implements IUserSessionRepository {
  rows: UserSession[] = [];
  authSessions = new Map<string, string>();
  endedAuthSessions: Array<{ userId: string; sessionId: string }> = [];

  addRow(row: Partial<UserSession> & { userId: string; sessionTokenId: string }): UserSession {
    const now = new Date().toISOString();
    const session: UserSession = {
      id: randomUUID(),
      browser: "Google Chrome",
      os: "macOS",
      deviceType: "desktop",
      ipAddress: "203.0.113.7",
      city: "Paris",
      country: "FR",
      isRevoked: false,
      lastActiveAt: now,
      createdAt: now,
      ...row,
    };
    this.rows.push(session);
    return session;
  }

  /** A live Supabase login, with or without a row. */
  addLogin(userId: string, sessionId: string, withRow = true): UserSession | null {
    this.authSessions.set(sessionId, userId);
    return withRow ? this.addRow({ userId, sessionTokenId: sessionId }) : null;
  }

  row(id: string): UserSession | undefined {
    return this.rows.find((r) => r.id === id);
  }

  async insertIfAbsent(data: NewUserSession): Promise<InsertSessionResult | null> {
    const existing = this.rows.find((r) => r.sessionTokenId === data.sessionTokenId);
    if (existing) {
      return existing.userId === data.userId ? { session: { ...existing }, created: false } : null;
    }
    const { userId, sessionTokenId, ...device } = data;
    const session = this.addRow({ userId, sessionTokenId, ...device });
    return { session: { ...session }, created: true };
  }

  async findByTokenId(userId: string, sessionTokenId: string): Promise<UserSession | null> {
    const row = this.rows.find((r) => r.userId === userId && r.sessionTokenId === sessionTokenId);
    return row ? { ...row } : null;
  }

  async findById(userId: string, id: string): Promise<UserSession | null> {
    const row = this.rows.find((r) => r.userId === userId && r.id === id);
    return row ? { ...row } : null;
  }

  async listActiveByUserId(userId: string): Promise<UserSession[]> {
    return this.rows
      .filter((r) => r.userId === userId && !r.isRevoked)
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
      .map((r) => ({ ...r }));
  }

  async revokeById(userId: string, id: string): Promise<UserSession | null> {
    const row = this.rows.find((r) => r.userId === userId && r.id === id);
    if (!row) return null;
    row.isRevoked = true;
    return { ...row };
  }

  async revokeByTokenId(userId: string, sessionTokenId: string): Promise<UserSession | null> {
    const row = this.rows.find((r) => r.userId === userId && r.sessionTokenId === sessionTokenId);
    if (!row) return null;
    row.isRevoked = true;
    return { ...row };
  }

  async revokeAllExcept(userId: string, keepSessionTokenId: string): Promise<UserSession[]> {
    const revoked = this.rows.filter(
      (r) => r.userId === userId && !r.isRevoked && r.sessionTokenId !== keepSessionTokenId
    );
    for (const row of revoked) row.isRevoked = true;
    return revoked.map((r) => ({ ...r }));
  }

  async touch(userId: string, sessionTokenId: string, device: Partial<DeviceDetails>): Promise<boolean> {
    const row = this.rows.find((r) => r.userId === userId && r.sessionTokenId === sessionTokenId && !r.isRevoked);
    if (!row) return false;
    for (const [key, value] of Object.entries(device)) {
      if (value !== undefined) (row as unknown as Record<string, unknown>)[key] = value;
    }
    row.lastActiveAt = new Date().toISOString();
    return true;
  }

  async endAuthSession(userId: string, sessionId: string): Promise<boolean> {
    this.endedAuthSessions.push({ userId, sessionId });
    if (this.authSessions.get(sessionId) !== userId) return false;
    this.authSessions.delete(sessionId);
    return true;
  }
}
