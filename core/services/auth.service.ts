import { SupabaseClient, User } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Workspace } from '@/core/entities/workspace';
import { UserProfile } from '@/core/entities/user-profile';
import { IWorkspaceRepository } from '@/core/repositories/workspace.repository';
import { IUserProfileRepository } from '@/core/repositories/user-profile.repository';

export interface UserSessionData {
  user: User | null;
  profile: UserProfile | null;
  workspace: Workspace | null;
}

export class AuthService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly profileRepo: IUserProfileRepository
  ) {}

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  }

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;
    return this.profileRepo.findById(user.id);
  }

  async getCurrentSessionData(): Promise<UserSessionData> {
    const user = await this.getCurrentUser();

    // console.log("user",user)
    if (!user) {
      return { user: null, profile: null, workspace: null };
    }

    const [profile, workspace] = await Promise.all([
      this.profileRepo.findById(user.id),
      this.workspaceRepo.findByOwnerId(user.id),
    ]);

    return { user, profile, workspace };
  }

  async signInWithPassword(email: string, password: string) {
    const res = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (res.data.user) {
      await this.profileRepo.updateLoginInfo(res.data.user.id);
    }

    return res;
  }

  async signUp(email: string, password: string, fullName: string) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
