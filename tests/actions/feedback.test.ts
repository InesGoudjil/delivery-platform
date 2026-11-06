import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addFeedbackAction,
  addFeedbackReplyAction,
  deleteFeedbackAction,
  deleteFeedbackReplyAction,
  updateFeedbackAction,
  updateFeedbackReplyAction,
} from "@/app/actions/feedback";
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
        deleteFeedback: vi.fn().mockResolvedValue(undefined),
        deleteReply: vi.fn().mockResolvedValue(undefined),
        updateFeedback: vi.fn(),
        updateReply: vi.fn(),
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

  it("permits deleteFeedbackAction and deleteFeedbackReplyAction for workspace members", async () => {
    mockAdminServices.delivery.getDeliveryById.mockResolvedValue({
      id: "del_1",
      workspaceId: "ws_1",
      passcodeHash: null,
    });
    mockUserServices.auth.getCurrentUser.mockResolvedValue({ id: "user_owner" });
    mockAdminServices.member.isMember.mockResolvedValue(true);

    const deleteResult = await deleteFeedbackAction("fb_1", undefined, "del_1");
    expect(deleteResult.success).toBe(true);
    expect(mockAdminServices.feedback.deleteFeedback).toHaveBeenCalledWith("fb_1");

    const deleteReplyResult = await deleteFeedbackReplyAction("reply_1", undefined, "del_1");
    expect(deleteReplyResult.success).toBe(true);
    expect(mockAdminServices.feedback.deleteReply).toHaveBeenCalledWith("reply_1");
  });

  it("permits updateFeedbackAction and updateFeedbackReplyAction", async () => {
    mockAdminServices.delivery.getDeliveryById.mockResolvedValue({
      id: "del_1",
      workspaceId: "ws_1",
      passcodeHash: null,
    });
    mockUserServices.auth.getCurrentUser.mockResolvedValue({ id: "user_owner" });
    mockAdminServices.member.isMember.mockResolvedValue(true);

    mockAdminServices.feedback.updateFeedback.mockResolvedValue({
      id: "fb_1",
      commentText: "Updated comment text",
    });
    mockAdminServices.feedback.updateReply.mockResolvedValue({
      id: "reply_1",
      commentText: "Updated reply text",
    });

    const updateResult = await updateFeedbackAction({
      feedbackId: "fb_1",
      commentText: "Updated comment text",
      deliveryId: "del_1",
    });
    expect(updateResult.success).toBe(true);
    expect(mockAdminServices.feedback.updateFeedback).toHaveBeenCalledWith("fb_1", "Updated comment text");

    const updateReplyResult = await updateFeedbackReplyAction({
      replyId: "reply_1",
      commentText: "Updated reply text",
      deliveryId: "del_1",
    });
    expect(updateReplyResult.success).toBe(true);
    expect(mockAdminServices.feedback.updateReply).toHaveBeenCalledWith("reply_1", "Updated reply text");
  });
});
