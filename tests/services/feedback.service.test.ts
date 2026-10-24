import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedbackService } from "@/core/services/feedback.service";
import type { IFeedbackRepository } from "@/core/repositories/feedback.repository";
import type { NotificationService } from "@/core/services/notification.service";

describe("core/services/FeedbackService", () => {
  let feedbackRepo: Partial<IFeedbackRepository>;
  let notificationService: Partial<NotificationService>;
  let service: FeedbackService;

  beforeEach(() => {
    feedbackRepo = {
      create: vi.fn().mockImplementation((dto) =>
        Promise.resolve({ id: "fb_new", ...dto, isResolved: false, createdAt: new Date() })
      ),
      createReply: vi.fn().mockImplementation((dto) =>
        Promise.resolve({ id: "reply_new", ...dto, createdAt: new Date() })
      ),
      deleteReply: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      resolve: vi.fn().mockImplementation((id, isResolved) =>
        Promise.resolve({ id, isResolved } as any)
      ),
      listRepliesByFeedbackId: vi.fn().mockResolvedValue([]),
      listByAssetVersionId: vi.fn().mockResolvedValue([]),
    };

    notificationService = {
      notifyNewFeedback: vi.fn().mockResolvedValue(undefined),
    };

    service = new FeedbackService(
      feedbackRepo as IFeedbackRepository,
      notificationService as NotificationService
    );
  });

  it("creates a new feedback comment", async () => {
    const feedback = await service.addFeedback({
      assetVersionId: "ver_1",
      commentText: "The color grade on this scene is too dark.",
      timestampSeconds: 45.2,
      authorName: "Client Reviewer",
    });

    expect(feedback.id).toBe("fb_new");
    expect(feedback.commentText).toBe("The color grade on this scene is too dark.");
    expect(feedbackRepo.create).toHaveBeenCalledOnce();
  });

  it("toggles resolution status", async () => {
    const resolved = await service.toggleResolved("fb_1", true);
    expect(resolved.isResolved).toBe(true);
    expect(feedbackRepo.resolve).toHaveBeenCalledWith("fb_1", true);
  });

  it("delegates reply creation and deletion", async () => {
    const reply = await service.addReply({
      feedbackId: "fb_1",
      commentText: "Adjusted in the new revision!",
      authorName: "Editor",
    });

    expect(reply.id).toBe("reply_new");
    expect(feedbackRepo.createReply).toHaveBeenCalledOnce();

    await service.deleteReply("reply_new");
    expect(feedbackRepo.deleteReply).toHaveBeenCalledWith("reply_new");
  });

  it("sends notification when notificationService is present", async () => {
    await service.notifyFeedback({
      deliveryId: "del_1",
      recipientEmails: "editor@studio.com",
      authorName: "Director",
      commentText: "Approved with notes",
      timestampSeconds: 12.0,
    });

    expect(notificationService.notifyNewFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: "del_1",
        authorName: "Director",
      })
    );
  });
});
