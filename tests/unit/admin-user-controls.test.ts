import { createHash } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import { AdminUserControls } from "@/core/admin/user-controls";
import { ADMIN_ACCOUNT_EXISTS_MESSAGE } from "@/core/admin/types";
import { parseSetupToken, SETUP_CLAIM_KEY } from "@/core/security/account-setup";

/** A Supabase client double covering what AdminUserControls calls. */
function fakeClient() {
  const select = vi.fn().mockResolvedValue({ data: [{ id: "row-1" }, { id: "row-2" }], error: null });
  const query = { update: vi.fn(), eq: vi.fn(), select };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    query,
    from: vi.fn().mockReturnValue(query),
    rpc: vi.fn().mockResolvedValue({ data: 3, error: null }),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: "00000000-0000-4000-8000-0000000000c1" } }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: { user: { banned_until: "2026-11-20T10:00:00Z" } }, error: null }),
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: {
              factors: [
                { id: "f1", friendly_name: "Phone", factor_type: "totp", status: "verified", created_at: "2026-11-01" },
                { id: "f2", friendly_name: null, factor_type: "totp", status: "unverified", created_at: "2026-11-02" },
              ],
            },
            error: null,
          }),
          deleteFactor: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    },
  };
}

describe("AdminUserControls", () => {
  it("signs out everywhere: flags the app's device rows and ends every Supabase login", async () => {
    const client = fakeClient();
    const result = await new AdminUserControls(client as any).signOutEverywhere("user-1");
    expect(client.from).toHaveBeenCalledWith("user_sessions");
    expect(client.query.update).toHaveBeenCalledWith({ is_revoked: true });
    expect(client.rpc).toHaveBeenCalledWith("admin_end_all_auth_sessions", { p_user_id: "user-1" });
    expect(result).toEqual({ revokedDevices: 2, endedLogins: 3 });
  });

  it("bans with Supabase durations and signs the user out", async () => {
    const client = fakeClient();
    const controls = new AdminUserControls(client as any);
    await expect(controls.ban("user-1", "7d")).resolves.toMatchObject({ bannedUntil: "2026-11-20T10:00:00Z", endedLogins: 3 });
    expect(client.auth.admin.updateUserById).toHaveBeenCalledWith("user-1", { ban_duration: "168h" });
    await controls.ban("user-1", "indefinite");
    expect(client.auth.admin.updateUserById).toHaveBeenLastCalledWith("user-1", { ban_duration: "876000h" });
    await controls.unban("user-1");
    expect(client.auth.admin.updateUserById).toHaveBeenLastCalledWith("user-1", { ban_duration: "none" });
  });

  it("resets two-factor by removing every method, finished or not, then signing out", async () => {
    const client = fakeClient();
    const result = await new AdminUserControls(client as any).resetTwoFactor("user-1");
    expect(client.auth.admin.mfa.deleteFactor.mock.calls.map(([args]) => args)).toEqual([
      { id: "f1", userId: "user-1" },
      { id: "f2", userId: "user-1" },
    ]);
    expect(result).toEqual({ removedFactors: 2, revokedDevices: 2, endedLogins: 3 });
  });

  it("fails loudly when Supabase refuses", async () => {
    const client = fakeClient();
    client.auth.admin.updateUserById.mockResolvedValue({ data: { user: null }, error: { message: "User not found" } });
    await expect(new AdminUserControls(client as any).ban("user-1", "24h")).rejects.toThrow("User not found");
  });

  it("creates a client account: email confirmed, named, no password, with the hash of a new setup link", async () => {
    const client = fakeClient();
    const result = await new AdminUserControls(client as any).createClientAccount({
      email: "karim@studio.test",
      fullName: "Karim Benali",
    });

    const [args] = client.auth.admin.createUser.mock.calls[0];
    expect(args).toMatchObject({
      email: "karim@studio.test",
      email_confirm: true,
      user_metadata: { full_name: "Karim Benali" },
    });
    expect(args).not.toHaveProperty("password");

    // The token belongs to the new user, and only its hash was stored.
    const parsed = parseSetupToken(result.token);
    expect(parsed?.userId).toBe("00000000-0000-4000-8000-0000000000c1");
    const claim = args.app_metadata[SETUP_CLAIM_KEY];
    expect(claim.token_hash).toBe(createHash("sha256").update(parsed!.secret).digest("hex"));
    expect(JSON.stringify(args)).not.toContain(parsed!.secret);
    expect(result.expiresAt).toBe(claim.expires_at);
  });

  it("says so when the email already has an account", async () => {
    const client = fakeClient();
    client.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { status: 422, code: "email_exists", message: "A user with this email address has already been registered" },
    });
    await expect(
      new AdminUserControls(client as any).createClientAccount({ email: "taken@studio.test", fullName: "Taken" })
    ).rejects.toThrow(ADMIN_ACCOUNT_EXISTS_MESSAGE);
  });

  it("replaces the setup link with a new one", async () => {
    const client = fakeClient();
    const result = await new AdminUserControls(client as any).issueSetupLink("00000000-0000-4000-8000-0000000000c1");
    const [userId, attrs] = client.auth.admin.updateUserById.mock.calls[0];
    expect(userId).toBe("00000000-0000-4000-8000-0000000000c1");
    expect(Object.keys(attrs)).toEqual(["app_metadata"]);
    const parsed = parseSetupToken(result.token);
    expect(attrs.app_metadata[SETUP_CLAIM_KEY].token_hash).toBe(createHash("sha256").update(parsed!.secret).digest("hex"));
  });
});
