import { describe, expect, it, vi } from "vitest";
import { MemberService } from "@/core/services/member.service";

const WS = "10000000-0000-4000-8000-00000000000a";

function serviceWith(authEmails: unknown) {
  const memberRepo = {
    listByWorkspaceId: vi.fn(async () => [
      { userId: "u-owner", role: "owner", workspaceId: WS },
      { userId: "u-admin", role: "admin", workspaceId: WS },
      { userId: "u-editor", role: "editor", workspaceId: WS },
      { userId: "u-viewer", role: "viewer", workspaceId: WS },
      { userId: "u-no-address", role: "admin", workspaceId: WS },
    ]),
  };
  const workspaceRepo = {
    findById: vi.fn(async () => ({ id: WS, ownerId: "u-owner", brandName: "Syncopy Films" })),
  };
  const userProfileRepo = {
    findById: vi.fn(async (id: string) => ({ id, fullName: id === "u-owner" ? "Christopher Nolan" : null })),
  };
  return new MemberService(
    memberRepo as never,
    {} as never,
    {} as never,
    workspaceRepo as never,
    userProfileRepo as never,
    undefined,
    undefined,
    undefined,
    authEmails as never
  );
}

describe("MemberService.listNotificationRecipients", () => {
  it("lists the owners and admins who have an address, with their first name", async () => {
    const authEmails = {
      emailsByUserId: vi.fn(async (ids: string[]) =>
        new Map(ids.filter((id) => id !== "u-no-address").map((id) => [id, `${id}@studio.test`]))
      ),
    };

    const recipients = await serviceWith(authEmails).listNotificationRecipients(WS);

    expect(recipients).toEqual([
      { userId: "u-owner", email: "u-owner@studio.test", firstName: "Christopher" },
      { userId: "u-admin", email: "u-admin@studio.test", firstName: null },
    ]);
    // Editors and viewers aren't asked for addresses at all.
    const asked = (authEmails.emailsByUserId.mock.calls[0] as unknown as [string[]])[0];
    expect(asked).toEqual(["u-owner", "u-admin", "u-no-address"]);
  });

  it("lists nobody when addresses can't be looked up", async () => {
    expect(await serviceWith(undefined).listNotificationRecipients(WS)).toEqual([]);
  });
});
