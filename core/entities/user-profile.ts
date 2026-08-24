export type PlatformRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  platformRole: PlatformRole;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  createdAt: string;
  updatedAt: string;
}
