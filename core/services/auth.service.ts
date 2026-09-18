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
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error || !user) return null;
      return user;
    } catch {
      return null;
    }
  }

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;
      return await this.profileRepo.findById(user.id);
    } catch {
      return null;
    }
  }

  async getCurrentSessionData(): Promise<UserSessionData> {
    try {
      const user = await this.getCurrentUser();

      if (!user) {
        return { user: null, profile: null, workspace: null };
      }

      const [profile, workspace] = await Promise.all([
        this.profileRepo.findById(user.id).catch(() => null),
        this.workspaceRepo.findByOwnerId(user.id).catch(() => null),
      ]);

      return { user, profile, workspace };
    } catch {
      return { user: null, profile: null, workspace: null };
    }
  }

  async signInWithPassword(email: string, password: string) {
    try {
      const res = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (res.data?.user) {
        await this.profileRepo.updateLoginInfo(res.data.user.id).catch(() => {});
      }

      return res;
    } catch (err: any) {
      return {
        data: { user: null, session: null },
        error: { message: err?.message || 'Authentication request failed. Please check network connection and Supabase URL.' },
      };
    }
  }

  async signUp(email: string, password: string, fullName: string) {
    try {
      return await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
    } catch (err: any) {
      return {
        data: { user: null, session: null },
        error: { message: err?.message || 'Sign up request failed. Please check network connection and Supabase URL.' },
      };
    }
  }

  async resetPasswordForEmail(email: string, redirectTo: string) {
    try {
      return await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
    } catch (err: any) {
      return {
        data: null,
        error: { message: err?.message || 'Failed to send password reset email.' },
      };
    }
  }

  async updateUserPassword(newPassword: string) {
    try {
      return await this.supabase.auth.updateUser({
        password: newPassword,
      });
    } catch (err: any) {
      return {
        data: { user: null },
        error: { message: err?.message || 'Failed to update password.' },
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch {
      // Ignore signout network errors
    }
  }
}
