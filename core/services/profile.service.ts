import { UserProfile, PlatformRole } from '@/core/entities/user-profile';
import { IUserProfileRepository } from '@/core/repositories/user-profile.repository';

export class ProfileService {
  constructor(private readonly profileRepo: IUserProfileRepository) {}

  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.profileRepo.findById(userId);
  }

  async listProfiles(limit = 100): Promise<UserProfile[]> {
    return this.profileRepo.listAll(limit);
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string | null;
      avatarUrl?: string | null;
    }
  ): Promise<UserProfile> {
    return this.profileRepo.update(userId, data);
  }

  async updatePlatformRole(userId: string, role: PlatformRole): Promise<UserProfile> {
    return this.profileRepo.updatePlatformRole(userId, role);
  }

  async recordLogin(userId: string, ip?: string): Promise<void> {
    return this.profileRepo.updateLoginInfo(userId, ip);
  }

  async syncOAuthProfile(
    userId: string,
    data: {
      fullName?: string | null;
      avatarUrl?: string | null;
      ip?: string;
    }
  ): Promise<UserProfile> {
    const existing = await this.profileRepo.findById(userId);
    const now = new Date().toISOString();

    if (!existing) {
      return this.profileRepo.upsert({
        id: userId,
        fullName: data.fullName || null,
        avatarUrl: data.avatarUrl || null,
        platformRole: 'user',
        lastLoginAt: now,
        lastLoginIp: data.ip || null,
      });
    }

    const payload: Partial<UserProfile> = {
      lastLoginAt: now,
    };
    if (data.ip) payload.lastLoginIp = data.ip;

    if ((!existing.fullName || existing.fullName === 'User') && data.fullName) {
      payload.fullName = data.fullName;
    }

    if (!existing.avatarUrl && data.avatarUrl) {
      payload.avatarUrl = data.avatarUrl;
    }

    return this.profileRepo.update(userId, payload);
  }
}

