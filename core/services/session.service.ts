import { IUserSessionRepository } from '@/core/repositories/user-session.repository';
import { UserSession, DeviceType } from '@/core/entities/user-session';

export interface RegisterSessionInput {
  userId: string;
  sessionTokenId: string;
  ipAddress?: string;
  browser: string;
  os: string;
  deviceType: DeviceType;
  city?: string;
  country?: string;
}

export class SessionService {
  constructor(private readonly sessionRepo: IUserSessionRepository) {}

  async registerSession(input: RegisterSessionInput): Promise<UserSession> {
    return this.sessionRepo.upsertSession(input);
  }

  async listActiveSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.listActiveByUserId(userId);
  }

  async getSessionByToken(sessionTokenId: string): Promise<UserSession | null> {
    return this.sessionRepo.findByTokenId(sessionTokenId);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    return this.sessionRepo.revokeSession(sessionId, userId);
  }

  async revokeAllOtherSessions(userId: string, currentSessionTokenId: string): Promise<void> {
    return this.sessionRepo.revokeAllOtherSessions(userId, currentSessionTokenId);
  }

  async touchSession(sessionTokenId: string): Promise<void> {
    return this.sessionRepo.updateLastActive(sessionTokenId);
  }
}
