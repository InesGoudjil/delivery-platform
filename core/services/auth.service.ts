import { SupabaseClient, User } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Workspace } from '@/core/entities/workspace';
import { UserProfile } from '@/core/entities/user-profile';
import { IWorkspaceRepository } from '@/core/repositories/workspace.repository';
import { IUserProfileRepository } from '@/core/repositories/user-profile.repository';
import { readSessionIdentity, type SessionIdentity } from '@/core/services/session.service';
import { hasVerifiedFactor, isAwaitingTwoFactor as claimsAwaitTwoFactor } from '@/lib/security/two-factor';
import { type QueryLog, timeQuery } from '@/core/observability/query-log';

export interface UserSessionData {
  user: User | null;
  profile: UserProfile | null;
  workspace: Workspace | null;
}

export class AuthService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly profileRepo: IUserProfileRepository,
    /** Times the session lookups below; they're network calls to Supabase Auth. */
    private readonly queryLog?: QueryLog
  ) {}

  /**
   * The signed-in user, checked with Supabase Auth, or null.
   *
   * Also null while someone with two-factor sign-in hasn't entered their code yet
   * (lib/security/two-factor.ts). Every page, action and guard then treats the session as signed
   * out, and the middleware sends it to /mfa. isAwaitingTwoFactor() tells the two cases apart.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await timeQuery(this.queryLog, 'auth.getUser', () => this.supabase.auth.getUser());

      if (error || !user) return null;
      this.queryLog?.setUser(user.id);
      // Only users with an authenticator pay for the token check.
      if (hasVerifiedFactor(user) && (await this.isAwaitingTwoFactor())) return null;
      return user;
    } catch {
      return null;
    }
  }

  /**
   * True when this session belongs to someone with two-factor sign-in who hasn't entered their
   * code yet. It reads the verified token's claims, as the middleware and RLS do.
   */
  async isAwaitingTwoFactor(): Promise<boolean> {
    try {
      const { data, error } = await timeQuery(this.queryLog, 'auth.getClaims', () => this.supabase.auth.getClaims());
      if (error || !data?.claims) return false;
      return claimsAwaitTwoFactor(data.claims);
    } catch {
      return false;
    }
  }

  /**
   * The session's assurance level, read from its verified token: 'aal2' once the user has
   * passed a two-factor check in this session, otherwise 'aal1'. Null without a valid session.
   */
  async getAssuranceLevel(): Promise<'aal1' | 'aal2' | null> {
    try {
      const { data, error } = await timeQuery(this.queryLog, 'auth.getClaims', () => this.supabase.auth.getClaims());
      if (error || !data?.claims) return null;
      return (data.claims as { aal?: string }).aal === 'aal2' ? 'aal2' : 'aal1';
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

  /**
   * Options:
   * - `signupRedirect`: a same-site path for /api/auth/confirm to open once the email is
   *   confirmed. It's kept in the user's metadata.
   * - `emailRedirectTo`: where Supabase's own link (`{{ .ConfirmationURL }}`, the old template)
   *   lands. It must be in Supabase's Redirect URLs list; otherwise Supabase uses the Site URL.
   */
  async signUp(
    email: string,
    password: string,
    fullName: string,
    options: { emailRedirectTo?: string; signupRedirect?: string } = {}
  ) {
    try {
      return await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ...(options.signupRedirect ? { signup_redirect: options.signupRedirect } : {}),
          },
          ...(options.emailRedirectTo ? { emailRedirectTo: options.emailRedirectTo } : {}),
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
  /**
   * The current login (user id and Supabase session id) from the verified access token.
   * Device rows are keyed on it. Null when signed out or when the token can't be verified.
   */
  async getSessionIdentity(): Promise<SessionIdentity | null> {
    return readSessionIdentity(this.supabase.auth);
  }

  /**
   * Signs this device out: ends its Supabase login and clears the auth cookies. Other devices
   * stay signed in. The local session is cleared even when Supabase Auth returns an error.
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.signOut({ scope: 'local' });
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /** Ends every other Supabase login of the signed-in user, with or without a device row. */
  async signOutOthers(): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.signOut({ scope: 'others' });
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
