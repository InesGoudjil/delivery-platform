import { UserProfile } from '@/core/entities/user-profile';
import { IUserProfileRepository } from '@/core/repositories/user-profile.repository';

export class ProfileService {
  constructor(private readonly profileRepo: IUserProfileRepository) {}

  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.profileRepo.findById(userId);
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

  async recordLogin(userId: string, ip?: string): Promise<void> {
    return this.profileRepo.updateLoginInfo(userId, ip);
  }
}
