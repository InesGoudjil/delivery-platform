export type PlatformRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  platformRole: PlatformRole;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  /** The Terms of Service version the user accepted (lib/legal/terms.ts), and when. */
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
