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
}
