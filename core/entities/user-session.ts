export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface UserSession {
  id: string;
  userId: string;
  sessionTokenId: string;
  ipAddress?: string | null;
  browser: string;
  browserVersion?: string | null;
  os: string;
  osVersion?: string | null;
  deviceType: DeviceType;
  city?: string | null;
  country?: string | null;
  isCurrent?: boolean;
  isRevoked: boolean;
  lastActiveAt: string;
  createdAt: string;
}
