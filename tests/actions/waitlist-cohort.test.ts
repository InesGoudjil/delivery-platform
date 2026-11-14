import { describe, it, expect, vi, beforeEach } from "vitest";
import { inviteWaitlistCohortAction } from "@/app/actions/waitlist";
import * as adminContext from "@/core/admin/context";

describe("inviteWaitlistCohortAction", () => {
  let inviteCohort: ReturnType<typeof vi.fn>;
  let record: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    inviteCohort = vi.fn().mockResolvedValue({ invitedCount: 2, invitedEmails: ["a@test", "b@test"] });
    record = vi.fn().mockResolvedValue(undefined);
  });

  const asAdmin = () =>
    vi.spyOn(adminContext, "getPlatformAdminServices").mockResolvedValue({
      user: { id: "admin_1", email: "admin@test" },
      profile: { platformRole: "admin" },
      services: { waitlist: { inviteCohort } },
      sessionServices: {},
      readModel: {},
      audit: { record },
    } as any);

  it("refuses callers who are not platform admins, and records nothing", async () => {
    vi.spyOn(adminContext, "getPlatformAdminServices").mockRejectedValue(
      new Error("Forbidden: Platform admin privileges required.")
    );

    const result: any = await inviteWaitlistCohortAction({ limit: 500, reason: "Next beta wave" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Forbidden");
    expect(result.invitedEmails).toBeUndefined();
    expect(inviteCohort).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("needs a reason", async () => {
    asAdmin();
    const result: any = await inviteWaitlistCohortAction({ limit: 20, reason: "ok" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/why/i);
    expect(inviteCohort).not.toHaveBeenCalled();
  });

  it("invites the cohort for a platform admin and records who did it and why", async () => {
    asAdmin();

    const result: any = await inviteWaitlistCohortAction({ limit: 20, reason: "Next beta wave" });

    expect(result.success).toBe(true);
    expect(result.invitedCount).toBe(2);
    expect(inviteCohort).toHaveBeenCalledWith(20, "http://localhost:3000");
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin_1",
        actorEmail: "admin@test",
        action: "waitlist.invite_cohort",
        targetType: "waitlist",
        reason: "Next beta wave",
        outcome: "succeeded",
        changes: { after: { invitedCount: 2 } },
      })
    );
  });
});
