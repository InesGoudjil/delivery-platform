import { describe, it, expect } from "vitest";
import {
  SupabaseWorkspaceMemberRepository,
  SupabaseWorkspaceInvitationRepository,
} from "@/core/repositories/workspace-member.repository";

type Call = [method: string, ...args: unknown[]];

/**
 * A Supabase client whose query builder records every call and resolves, when awaited, to `result`
 * (what PostgREST would have answered).
 */
function fakeSupabase(result: { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          calls.push([String(prop), ...args]);
          return builder;
        };
      },
    }
  );
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  };
  return { client: client as any, calls };
}

const memberRowData = { id: "mem_1", workspace_id: "ws_1", user_id: "user_1", role: "viewer", joined_at: "2026-01-01" };
const invitationRowData = {
  id: "inv_1",
  workspace_id: "ws_1",
  inviter_id: "user_owner",
  email: "invitee@studio.com",
  role: "editor",
  token: "token_1",
  status: "accepted",
  expires_at: "2026-12-01T00:00:00.000Z",
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
};

describe("SupabaseWorkspaceMemberRepository", () => {
  describe("removeMember", () => {
    it("deletes the membership and asks for the deleted rows back", async () => {
      const { client, calls } = fakeSupabase({ data: [{ id: "mem_1" }], error: null });

      await new SupabaseWorkspaceMemberRepository(client).removeMember("ws_1", "user_1");

      expect(calls).toEqual([
        ["from", "workspace_members"],
        ["delete"],
        ["eq", "workspace_id", "ws_1"],
        ["eq", "user_id", "user_1"],
        ["select", "id"],
      ]);
    });

    it("throws when nothing was deleted (not a member, or RLS refused it)", async () => {
      const { client } = fakeSupabase({ data: [], error: null });

      await expect(new SupabaseWorkspaceMemberRepository(client).removeMember("ws_1", "user_1")).rejects.toThrow(
        "Nobody was removed"
      );
    });

    it("passes on the database's reason, such as the owner protection trigger", async () => {
      const { client } = fakeSupabase({
        data: null,
        error: { code: "42501", message: "The workspace owner can't be removed or demoted; transfer ownership first" },
      });

      await expect(new SupabaseWorkspaceMemberRepository(client).removeMember("ws_1", "user_1")).rejects.toThrow(
        "Error removing member: The workspace owner can't be removed or demoted; transfer ownership first"
      );
    });
  });

  describe("updateRole", () => {
    it("returns the updated membership", async () => {
      const { client, calls } = fakeSupabase({ data: { ...memberRowData, role: "editor" }, error: null });

      const member = await new SupabaseWorkspaceMemberRepository(client).updateRole("ws_1", "user_1", "editor");

      expect(member).toMatchObject({ userId: "user_1", role: "editor" });
      expect(calls).toContainEqual(["update", { role: "editor" }]);
      expect(calls).toContainEqual(["maybeSingle"]);
    });

    it("throws when no row changed (not a member, or RLS hid the row)", async () => {
      const { client } = fakeSupabase({ data: null, error: null });

      await expect(
        new SupabaseWorkspaceMemberRepository(client).updateRole("ws_1", "user_1", "admin")
      ).rejects.toThrow("The role was not changed");
    });

    it("explains row-level security refusals in plain words", async () => {
      const { client } = fakeSupabase({
        data: null,
        error: { code: "42501", message: 'new row violates row-level security policy for table "workspace_members"' },
      });

      await expect(
        new SupabaseWorkspaceMemberRepository(client).updateRole("ws_1", "user_1", "admin")
      ).rejects.toThrow("Error updating member role: You do not have permission to make this change.");
    });
  });
});

describe("SupabaseWorkspaceInvitationRepository", () => {
  describe("claimPendingByToken", () => {
    it("accepts only a pending, unexpired invitation, in one UPDATE that returns the row", async () => {
      const { client, calls } = fakeSupabase({ data: invitationRowData, error: null });
      const before = Date.now();

      const claimed = await new SupabaseWorkspaceInvitationRepository(client).claimPendingByToken("token_1");

      expect(claimed).toMatchObject({ id: "inv_1", token: "token_1", status: "accepted", role: "editor" });
      expect(calls).toEqual([
        ["from", "workspace_invitations"],
        ["update", { status: "accepted" }],
        ["eq", "token", "token_1"],
        ["eq", "status", "pending"],
        ["gt", "expires_at", expect.any(String)],
        ["select"],
        ["maybeSingle"],
      ]);
      // expires_at > now
      const cutoff = Date.parse(calls[4][2] as string);
      expect(cutoff).toBeGreaterThanOrEqual(before);
      expect(cutoff).toBeLessThanOrEqual(Date.now());
    });

    it("returns null when nothing matched (already accepted, revoked, expired or unknown)", async () => {
      const { client } = fakeSupabase({ data: null, error: null });

      await expect(new SupabaseWorkspaceInvitationRepository(client).claimPendingByToken("token_1")).resolves.toBeNull();
    });

    it("throws on database errors instead of reporting a lost race", async () => {
      const { client } = fakeSupabase({ data: null, error: { message: "connection reset" } });

      await expect(new SupabaseWorkspaceInvitationRepository(client).claimPendingByToken("token_1")).rejects.toThrow(
        "Error accepting invitation: connection reset"
      );
    });
  });

  describe("updateStatus", () => {
    it("only changes an invitation still in the expected status", async () => {
      const { client, calls } = fakeSupabase({ data: { ...invitationRowData, status: "revoked" }, error: null });

      await new SupabaseWorkspaceInvitationRepository(client).updateStatus("inv_1", "revoked", "pending");

      expect(calls).toEqual([
        ["from", "workspace_invitations"],
        ["update", { status: "revoked" }],
        ["eq", "id", "inv_1"],
        ["eq", "status", "pending"],
        ["select"],
        ["maybeSingle"],
      ]);
    });

    it("throws when no row changed", async () => {
      const { client } = fakeSupabase({ data: null, error: null });
      const repo = new SupabaseWorkspaceInvitationRepository(client);

      await expect(repo.updateStatus("inv_1", "revoked", "pending")).rejects.toThrow("The invitation is no longer pending.");
      await expect(repo.updateStatus("inv_1", "expired")).rejects.toThrow("Invitation not found.");
    });
  });

  describe("delete", () => {
    it("deletes the invitation and asks for the deleted rows back", async () => {
      const { client, calls } = fakeSupabase({ data: [{ id: "inv_1" }], error: null });

      await new SupabaseWorkspaceInvitationRepository(client).delete("inv_1");

      expect(calls).toEqual([["from", "workspace_invitations"], ["delete"], ["eq", "id", "inv_1"], ["select", "id"]]);
    });

    it("throws when nothing was deleted", async () => {
      const { client } = fakeSupabase({ data: [], error: null });

      await expect(new SupabaseWorkspaceInvitationRepository(client).delete("inv_1")).rejects.toThrow(
        "The invitation was not deleted"
      );
    });
  });
});
