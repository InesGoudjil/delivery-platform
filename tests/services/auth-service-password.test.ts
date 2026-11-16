import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * AuthService.verifyPassword: checks a password on a client that keeps no session, so the
 * signed-in user's own session (and its two-factor level) is never replaced.
 */

const mocks = vi.hoisted(() => ({ createStatelessClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createStatelessClient: mocks.createStatelessClient }));

import { AuthService } from "@/core/services/auth.service";

function probeClient(result: { session?: unknown; error?: { message: string; code?: string } | null }) {
  const auth = {
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: result.session ? { id: "u1" } : null, session: result.session ?? null },
      error: result.error ?? null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  mocks.createStatelessClient.mockReturnValue({ auth });
  return auth;
}

describe("AuthService.verifyPassword", () => {
  const sessionAuth = { signInWithPassword: vi.fn(), updateUser: vi.fn() };
  const authService = new AuthService({ auth: sessionAuth } as any, {} as any, {} as any);

  beforeEach(() => {
    mocks.createStatelessClient.mockReset();
    sessionAuth.signInWithPassword.mockReset();
  });

  it("signs in on the throwaway client, ends that login at once, and leaves the session alone", async () => {
    const probe = probeClient({ session: { access_token: "t" } });

    await expect(authService.verifyPassword("ann@test.example", "pw", "turnstile-token")).resolves.toEqual({ ok: true });

    expect(probe.signInWithPassword).toHaveBeenCalledWith({
      email: "ann@test.example",
      password: "pw",
      options: { captchaToken: "turnstile-token" },
    });
    expect(probe.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(sessionAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("reports Supabase's error code for a wrong password or a failed bot check", async () => {
    probeClient({ error: { message: "Invalid login credentials", code: "invalid_credentials" } });

    await expect(authService.verifyPassword("ann@test.example", "wrong")).resolves.toEqual({
      ok: false,
      code: "invalid_credentials",
      message: "Invalid login credentials",
    });
  });

  it("passes the current password on with the new one, for Supabase's own check", async () => {
    sessionAuth.updateUser.mockResolvedValue({ data: { user: {} }, error: null });

    await authService.updateUserPassword("new password 22", "old password 1");
    expect(sessionAuth.updateUser).toHaveBeenLastCalledWith({ password: "new password 22", current_password: "old password 1" });

    await authService.updateUserPassword("new password 22");
    expect(sessionAuth.updateUser).toHaveBeenLastCalledWith({ password: "new password 22" });
  });
});
