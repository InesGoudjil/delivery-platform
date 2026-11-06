import { describe, it, expect, vi, beforeEach } from "vitest";
import { addFeedbackAction, addFeedbackReplyAction } from "@/app/actions/feedback";
import * as serverModule from "@/core/server";

describe("app/actions/feedback (Comment Control Gating)", () => {
  let mockAdminServices: any;
  let mockUserServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockAdminServices = {
      delivery: {
        getDeliveryByShareToken: vi.fn(),
        getDeliveryById: vi.fn(),
      },
      member: {
        isMember: vi.fn().mockResolvedValue(false),
      },
      feedback: {
        addFeedback: vi.fn(),
        addReply: vi.fn(),
      },
    };

    mockUserServices = {
      auth: {
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
    };

    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(mockAdminServices);
    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(mockUserServices);
  });

  it("blocks addFeedbackAction when delivery has isCommentAllowed = false", async () => {
    mockAdminServices.delivery.getDeliveryByShareToken.mockResolvedValue({
      id: "del_1",
      workspaceId: "ws_1",
      shareToken: "token_abc",
      passcodeHash: null,
      isCommentAllowed: false,
    });

    const result = await addFeedbackAction({
      assetVersionId: "ver_1",
      authorName: "Guest Client",
      commentText: "Please make the cut brighter",
      shareToken: "token_abc",
    });

    expect(result.error).toContain("Comments are disabled for this delivery cut");
    expect(mockAdminServices.feedback.addFeedback).not.toHaveBeenCalled();
  });

  it("blocks addFeedbackReplyAction when delivery has isCommentAllowed = false", async () => {
    mockAdminServices.delivery.getDeliveryByShareToken.mockResolvedValue({
      id: "del_1",
      workspaceId: "ws_1",
      shareToken: "token_abc",
      passcodeHash: null,
      isCommentAllowed: false,
    });

    const result = await addFeedbackReplyAction({
      feedbackId: "fb_1",
      commentText: "Replying to note",
      shareToken: "token_abc",
    });

    expect(result.error).toContain("Comments are disabled for this delivery cut");
    expect(mockAdminServices.feedback.addReply).not.toHaveBeenCalled();
  });

  it("permits addFeedbackAction when isCommentAllowed is true", async () => {
    mockAdminServices.delivery.getDeliveryByShareToken.mockResolvedValue({
      id: "del_1",
      workspaceId: "ws_1",
      shareToken: "token_abc",
      passcodeHash: null,
      isCommentAllowed: true,
    });

    mockAdminServices.feedback.addFeedback.mockResolvedValue({
      id: "fb_1",
      commentText: "Looks amazing!",
    });

    const result = await addFeedbackAction({
      assetVersionId: "ver_1",
      authorName: "Guest Client",
      commentText: "Looks amazing!",
      shareToken: "token_abc",
    });

    expect(result.success).toBe(true);
    expect(mockAdminServices.feedback.addFeedback).toHaveBeenCalled();
  });
});
