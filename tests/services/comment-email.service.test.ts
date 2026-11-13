import { describe, expect, it, vi } from "vitest";
import { CommentEmailService, COMMENT_EMAIL_WINDOW_SECONDS } from "@/core/services/comment-email.service";

const WS = "10000000-0000-4000-8000-00000000000a";
const DEL = "30000000-0000-4000-8000-00000000000a";
const SECOND_DEL = "30000000-0000-4000-8000-0000000000ff";
const GONE_DEL = "30000000-0000-4000-8000-0000000000ee";

const BATCH = {
  delivery_id: DEL,
  workspace_id: WS,
  comment_count: 3,
  author: "Lost in Tokyo Group",
  excerpt: "Trim the intro",
  version_number: 2,
};

function build(
  options: {
    claimed?: unknown[];
    notifyComments?: boolean;
    recipients?: unknown[];
    sendOutcomes?: Array<{ sent: boolean; error?: string }> | Error;
    rpcError?: { message: string } | null;
  } = {}
) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_due_comment_email_batches") return { data: options.claimed ?? [], error: null };
    return { data: null, error: options.rpcError ?? null };
  });
  const deliveryRepo = {
    findById: vi.fn(async (id: string) =>
      id === DEL || id === SECOND_DEL ? { id, workspaceId: WS, title: "Omakase" } : null
    ),
  };
  const workspaceRepo = { findById: vi.fn(async () => ({ id: WS, slug: "syncopy", brandName: "Syncopy Films" })) };
  const settingsRepo = {
    findByWorkspaceId: vi.fn(async () => ({ notifyComments: options.notifyComments ?? true })),
  };
  const memberService = {
    listNotificationRecipients: vi.fn(
      async () => options.recipients ?? [{ userId: "u1", email: "owner@studio.test", firstName: "Christopher" }]
    ),
  };
  const sendOutcomes = options.sendOutcomes ?? [{ sent: true }];
  const notificationService = {
    sendClientCommentsEmail: vi.fn(async () => {
      if (sendOutcomes instanceof Error) throw sendOutcomes;
      return sendOutcomes;
    }),
  };
  const service = new CommentEmailService({
    supabase: { rpc } as never,
    notificationService: notificationService as never,
    memberService: memberService as never,
    settingsRepo: settingsRepo as never,
    deliveryRepo: deliveryRepo as never,
    workspaceRepo: workspaceRepo as never,
  });
  return { service, rpc, notificationService, memberService };
}

describe("recording a client's comment", () => {
  it("counts it into the delivery's window, with the ten-minute window the library asks for", async () => {
    const { service, rpc } = build();
    await service.record({ deliveryId: DEL, authorName: "Sara\nKhan", commentText: "Trim the intro", versionNumber: 2 });

    expect(COMMENT_EMAIL_WINDOW_SECONDS).toBe(600);
    expect(rpc).toHaveBeenCalledWith("record_comment_email", {
      p_delivery_id: DEL,
      p_workspace_id: WS,
      p_author: "Sara Khan",
      p_excerpt: "Trim the intro",
      p_version_number: 2,
      p_window_seconds: 600,
    });
  });

  it("fills in a name and text that are missing, and a version below 1", async () => {
    const { service, rpc } = build();
    await service.record({ deliveryId: DEL, authorName: "", commentText: "  ", versionNumber: 0 });
    expect(rpc).toHaveBeenCalledWith(
      "record_comment_email",
      expect.objectContaining({ p_author: "Client", p_excerpt: "New comment", p_version_number: 1 })
    );
  });

  it("records nothing for a delivery that doesn't exist", async () => {
    const { service, rpc } = build();
    await service.record({ deliveryId: GONE_DEL, authorName: "Sara", commentText: "Hi", versionNumber: 1 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports a failure to record, so the caller can log it", async () => {
    const { service } = build({ rpcError: { message: "boom" } });
    await expect(
      service.record({ deliveryId: DEL, authorName: "Sara", commentText: "Hi", versionNumber: 1 })
    ).rejects.toThrow(/boom/);
  });
});

describe("sending the closed batches", () => {
  it("claims up to 100 batches and emails the studio the count, the latest comment and the version", async () => {
    const { service, rpc, notificationService } = build({ claimed: [BATCH] });
    const result = await service.flushDue("https://app.test");

    expect(rpc).toHaveBeenCalledWith("claim_due_comment_email_batches", { p_limit: 100 });
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(notificationService.sendClientCommentsEmail).toHaveBeenCalledWith({
      deliveryId: DEL,
      recipients: [{ userId: "u1", email: "owner@studio.test", firstName: "Christopher" }],
      clientName: "Lost in Tokyo Group",
      commentCount: 3,
      preview: "Trim the intro",
      versionNumber: 2,
      origin: "https://app.test",
    });
  });

  it("drops a batch without sending when the studio has turned comment emails off", async () => {
    const { service, notificationService } = build({ claimed: [BATCH], notifyComments: false });
    expect(await service.flushDue("https://app.test")).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(notificationService.sendClientCommentsEmail).not.toHaveBeenCalled();
  });

  it("drops a batch when no owner or admin has an address", async () => {
    const { service, notificationService } = build({ claimed: [BATCH], recipients: [] });
    expect(await service.flushDue("https://app.test")).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(notificationService.sendClientCommentsEmail).not.toHaveBeenCalled();
  });

  it("counts a batch as failed when none of its emails went out", async () => {
    const { service } = build({ claimed: [BATCH], sendOutcomes: [{ sent: false, error: "Mailbox full" }] });
    expect(await service.flushDue("https://app.test")).toEqual({ sent: 0, skipped: 0, failed: 1 });
  });

  it("keeps going when one batch fails", async () => {
    const other = { ...BATCH, delivery_id: SECOND_DEL };
    const { service, notificationService } = build({ claimed: [BATCH, other] });
    notificationService.sendClientCommentsEmail
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValueOnce([{ sent: true }]);

    expect(await service.flushDue("https://app.test")).toEqual({ sent: 1, skipped: 0, failed: 1 });
    expect(notificationService.sendClientCommentsEmail).toHaveBeenCalledTimes(2);
  });

  it("skips a batch for a delivery that was deleted meanwhile", async () => {
    const { service, notificationService } = build({ claimed: [{ ...BATCH, delivery_id: GONE_DEL }] });
    expect(await service.flushDue("https://app.test")).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(notificationService.sendClientCommentsEmail).not.toHaveBeenCalled();
  });
});
