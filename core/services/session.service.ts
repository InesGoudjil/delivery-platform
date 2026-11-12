import type {
  DeviceDetails,
  IUserSessionRepository,
} from '@/core/repositories/user-session.repository';
import type { UserSession } from '@/core/entities/user-session';

/**
 * A Supabase login, as its verified access token describes it. Device rows (user_sessions) are
 * keyed on `sessionId`, so a device can only escape a revocation by signing in again.
 */
export interface SessionIdentity {
  userId: string;
  /** The access token's `session_id` claim: auth.sessions.id, stored as user_sessions.session_token_id. */
  sessionId: string;
}

export interface RegisterSessionInput extends DeviceDetails {
  userId: string;
  /** The login's session id (SessionIdentity.sessionId). */
  sessionTokenId: string;
}

/** 'current' is the device asking: it signs out instead. 'not_found' covers other users' rows. */
export type RevokeSessionOutcome = 'revoked' | 'not_found' | 'current';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * The user id (`sub`) and login id (`session_id`) from verified access-token claims. Null unless
 * both are UUIDs, as they are in every token Supabase Auth issues for a login.
 */
export function sessionIdentityFromClaims(claims: unknown): SessionIdentity | null {
  if (!claims || typeof claims !== 'object') return null;
  const { sub, session_id: sessionId } = claims as { sub?: unknown; session_id?: unknown };
  if (!isUuid(sub) || !isUuid(sessionId)) return null;
  return { userId: sub.toLowerCase(), sessionId: sessionId.toLowerCase() };
}

/** Anything with Supabase Auth's getClaims(), e.g. `supabase.auth`. */
export interface ClaimsReader {
  getClaims(): Promise<{ data: { claims: unknown } | null; error: unknown }>;
}

/**
 * The login behind a Supabase client's access token. getClaims() verifies the token (and
 * refreshes it first when it is about to expire). Null when signed out or unverifiable.
 */
export async function readSessionIdentity(auth: ClaimsReader): Promise<SessionIdentity | null> {
  try {
    const { data, error } = await auth.getClaims();
    if (error || !data?.claims) return null;
    return sessionIdentityFromClaims(data.claims);
  } catch {
    return null;
  }
}

/**
 * Signed-in devices of a user. The repository must use the service role: users can read their
 * own rows but nobody else can write them.
 */
export class SessionService {
  constructor(private readonly sessionRepo: IUserSessionRepository) {}

  /**
   * Records the device behind a login the first time it is seen. An existing row is never reset:
   * a revoked login stays revoked, and an active one only gets its last-active time and device
   * details refreshed.
   */
  async registerSession(input: RegisterSessionInput): Promise<UserSession> {
    const stored = await this.sessionRepo.insertIfAbsent(input);
    if (!stored) {
      // Session ids are unique: this one is on another user's row. Never take it over.
      throw new Error('This login is already recorded for another account.');
    }

    const { session, created } = stored;
    if (!created && !session.isRevoked) {
      await this.sessionRepo.touch(input.userId, input.sessionTokenId, {
        ipAddress: input.ipAddress,
        browser: input.browser,
        os: input.os,
        deviceType: input.deviceType,
        city: input.city,
        country: input.country,
      });
    }
    return session;
  }

  async listActiveSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.listActiveByUserId(userId);
  }

  /** The row of a login, revoked or not; null when it has none yet. */
  async getSession(identity: SessionIdentity): Promise<UserSession | null> {
    return this.sessionRepo.findByTokenId(identity.userId, identity.sessionId);
  }

  /**
   * Signs another device of the signed-in user out. Flags its row first, so the middleware turns
   * the device away on its next request even if the second step fails, then ends its Supabase
   * login so it can't refresh its access token. `rowId` is the id the security page shows; a row
   * of another user is 'not_found'.
   */
  async revokeSession(current: SessionIdentity, rowId: string): Promise<RevokeSessionOutcome> {
    if (!isUuid(rowId)) return 'not_found';

    const row = await this.sessionRepo.findById(current.userId, rowId);
    if (!row) return 'not_found';
    if (row.sessionTokenId === current.sessionId) return 'current';

    const revoked = await this.sessionRepo.revokeById(current.userId, rowId);
    if (!revoked) return 'not_found';

    // A row keyed on an old cookie id has no Supabase login behind it.
    if (isUuid(revoked.sessionTokenId)) {
      await this.sessionRepo.endAuthSession(current.userId, revoked.sessionTokenId);
    }
    return 'revoked';
  }

  /**
   * Flags every other row of the signed-in user revoked and returns them. The caller also ends
   * those Supabase logins (AuthService.signOutOthers), which covers logins without a row.
   */
  async revokeAllOtherSessions(current: SessionIdentity): Promise<UserSession[]> {
    return this.sessionRepo.revokeAllExcept(current.userId, current.sessionId);
  }

  /** On sign-out: flags this login's row revoked. False when the login had no row. */
  async markSignedOut(current: SessionIdentity): Promise<boolean> {
    return (await this.sessionRepo.revokeByTokenId(current.userId, current.sessionId)) !== null;
  }
}
