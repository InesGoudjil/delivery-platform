import { describe, it, expect, vi, beforeEach } from "vitest";
import { inviteWaitlistCohortAction } from "@/app/actions/waitlist";
import * as guards from "@/core/security/guards";

describe("inviteWaitlistCohortAction", () => {
  let inviteCohort: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    inviteCohort = vi.fn().mockResolvedValue({ invitedCount: 2, invitedEmails: ["a@test", "b@test"] });
  });

  it("refuses callers who are not platform admins", async () => {
    vi.spyOn(guards, "requirePlatformAdmin").mockRejectedValue(
      new Error("Forbidden: Platform admin privileges required.")
    );

    const result: any = await inviteWaitlistCohortAction(500);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Forbidden");
    expect(result.invitedEmails).toBeUndefined();
    expect(inviteCohort).not.toHaveBeenCalled();
  });

  it("invites the cohort for a platform admin", async () => {
    vi.spyOn(guards, "requirePlatformAdmin").mockResolvedValue({
      user: { id: "admin_1" },
      services: { waitlist: { inviteCohort } },
    } as any);

    const result: any = await inviteWaitlistCohortAction(20);

    expect(result.success).toBe(true);
    expect(result.invitedCount).toBe(2);
    expect(inviteCohort).toHaveBeenCalledWith(20, "http://localhost:3000");
  });
});
