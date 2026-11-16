import { describe, it, expect, vi } from "vitest";
import { AuthService } from "@/core/services/auth.service";

/**
 * AuthService.getCurrentUser() treats a session that is waiting for its two-factor code as signed
 * out, so every page, action and guard refuses it (lib/security/two-factor.ts).
 */

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "ann@test.example" };

function service(user: Record<string, unknown> | null, claims: Record<string, unknown> | null) {
  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    getClaims: vi.fn().mockResolvedValue({ data: claims ? { claims } : null, error: null }),
  };
  return { auth, authService: new AuthService({ auth } as any, {} as any, {} as any) };
}

describe("AuthService and two-factor sign-in", () => {
  it("returns users without an authenticator without checking the token again", async () => {
    const { auth, authService } = service({ ...USER, factors: [] }, null);

    await expect(authService.getCurrentUser()).resolves.toMatchObject({ id: USER.id });
    expect(auth.getClaims).not.toHaveBeenCalled();
  });

  it("returns null while a user with an authenticator hasn't entered their code", async () => {
    const { authService } = service(
      { ...USER, factors: [{ status: "verified" }] },
      { sub: USER.id, aal: "aal1", mfa_enrolled: true }
    );

    await expect(authService.getCurrentUser()).resolves.toBeNull();
    await expect(authService.isAwaitingTwoFactor()).resolves.toBe(true);
  });

  it("returns the user once the session is aal2", async () => {
    const { authService } = service(
      { ...USER, factors: [{ status: "verified" }] },
      { sub: USER.id, aal: "aal2", mfa_enrolled: true }
    );

    await expect(authService.getCurrentUser()).resolves.toMatchObject({ id: USER.id });
    await expect(authService.isAwaitingTwoFactor()).resolves.toBe(false);
  });

  it("changes nothing until the access-token hook adds the claim (the middleware and RLS agree)", async () => {
    const { authService } = service({ ...USER, factors: [{ status: "verified" }] }, { sub: USER.id, aal: "aal1" });

    await expect(authService.getCurrentUser()).resolves.toMatchObject({ id: USER.id });
  });

  it("is signed out when there is no user", async () => {
    const { authService } = service(null, null);

    await expect(authService.getCurrentUser()).resolves.toBeNull();
    await expect(authService.isAwaitingTwoFactor()).resolves.toBe(false);
  });
});
