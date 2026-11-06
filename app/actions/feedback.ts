"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerServices, getServerAdminServices } from "@/core/server";
import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import { hasValidDeliveryPasscodeCookie } from "@/lib/security/delivery-token";
import {
  addFeedbackSchema,
  addFeedbackReplySchema,
  toggleFeedbackResolvedSchema,
  deleteFeedbackSchema,
  deleteFeedbackReplySchema,
  updateFeedbackSchema,
  updateFeedbackReplySchema,
  safeValidate,
  type AddFeedbackInput,
  type AddFeedbackReplyInput,
  type DeleteFeedbackInput,
  type DeleteFeedbackReplyInput,
  type UpdateFeedbackInput,
  type UpdateFeedbackReplyInput,
} from "@/lib/validations";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ actionGroup: "feedback" });

type AddFeedbackParams = AddFeedbackInput;
type AddFeedbackReplyParams = AddFeedbackReplyInput;

/**
 * Helper to verify guest or member access to a delivery cut
 */
async function verifyDeliveryAccessContext(shareToken?: string, deliveryId?: string) {
  const adminServices = await getServerAdminServices();
  let delivery = null;

  if (shareToken) {
    delivery = await adminServices.delivery.getDeliveryByShareToken(shareToken);
  } else if (deliveryId) {
    delivery = await adminServices.delivery.getDeliveryById(deliveryId);
  }

  const userServices = await getServerServices();
  const user = await userServices.auth.getCurrentUser();

  if (delivery && user) {
    const isMember = await adminServices.member.isMember(delivery.workspaceId, user.id).catch(() => false);
    if (isMember) {
      return { isAuthorized: true, delivery, user, adminServices };
    }
  }

  if (delivery) {
    if (!delivery.passcodeHash) {
      return { isAuthorized: true, delivery, user, adminServices };
    }

    const cookieStore = await cookies();
    if (hasValidDeliveryPasscodeCookie(cookieStore, delivery.shareToken)) {
      return { isAuthorized: true, delivery, user, adminServices };
    }
  }

  return { isAuthorized: false, delivery, user, adminServices };
}

export async function addFeedbackAction(params: AddFeedbackParams) {
  try {
    const validated = safeValidate(addFeedbackSchema, params);
    if (!validated.success) {
      return { error: validated.error };
    }

    const {
      assetVersionId,
      authorName,
      commentText,
      timestampSeconds,
      parentId,
      shareToken,
      deliveryId,
    } = validated.data;

    const adminServices = await getServerAdminServices();
    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    // Verify access
    let deliveryContext: any = null;
    if (shareToken || deliveryId) {
      const authCtx = await verifyDeliveryAccessContext(shareToken, deliveryId);
      if (!authCtx.isAuthorized) {
        return { error: "Passcode verification required to leave feedback on this cut." };
      }
      deliveryContext = authCtx.delivery;
      if (deliveryContext && deliveryContext.isCommentAllowed === false) {
        return { error: "Comments are disabled for this delivery cut." };
      }
    } else {
      if (!user) {
        return { error: "Unauthorized. Authentication or delivery share token required." };
      }
    }

    // If a parentId is provided, delegate to addReply for backward compatibility
    if (parentId) {
      const reply = await adminServices.feedback.addReply({
        feedbackId: parentId,
        authorUserId: user?.id,
        authorName: authorName || (user?.email ? user.email.split("@")[0] : "Client Guest"),
        commentText,
      });

      if (shareToken) {
        revalidatePath(`/deliver/${shareToken}`);
      }
      revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
      revalidatePath("/[workspaceSlug]/deliveries", "page");
      return { success: true, reply };
    }

    const feedback = await adminServices.feedback.addFeedback({
      assetVersionId,
      authorUserId: user?.id,
      authorName: authorName || (user?.email ? user.email.split("@")[0] : "Client Guest"),
      commentText,
      timestampSeconds,
    });

    // Dispatch real-time note alert to studio members if notification preference is active
    if (deliveryContext) {
      try {
        const settings = await adminServices.settings.findByWorkspaceId(deliveryContext.workspaceId);
        const shouldNotify = settings ? settings.notifyComments : true;
        if (shouldNotify) {
          const members = await adminServices.member.listMembers(deliveryContext.workspaceId);
          const notifyEmails = members
            .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
            .map((m) => m.email as string);

          if (notifyEmails.length > 0) {
            let origin = "https://cut.app";
            try {
              const { headers } = await import("next/headers");
              const headerList = await headers();
              const host = headerList.get("host");
              const proto = headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
              if (host) origin = `${proto}://${host}`;
            } catch {
              // fallback
            }

            await adminServices.notification
              .notifyNewFeedback({
                deliveryId: deliveryContext.id,
                recipientEmails: notifyEmails,
                authorName: authorName || (user?.email ? user.email.split("@")[0] : "Client Guest"),
                commentText,
                timestampSeconds,
                origin,
              })
              .catch((err) => log.warn({ err }, "Failed to dispatch note notification"));
          }
        }
      } catch (notifyErr) {
        log.warn({ err: notifyErr }, "Feedback notification warning");
      }
    }

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, feedback };
  } catch (err: any) {
    return { error: err.message || "Failed to add feedback." };
  }
}

export async function addFeedbackReplyAction(params: AddFeedbackReplyParams) {
  try {
    const validated = safeValidate(addFeedbackReplySchema, params);
    if (!validated.success) {
      return { error: validated.error };
    }

    const { feedbackId, commentText, authorName, shareToken, deliveryId } = validated.data;

    const adminServices = await getServerAdminServices();
    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    // Verify access
    if (shareToken || deliveryId) {
      const { isAuthorized, delivery } = await verifyDeliveryAccessContext(shareToken, deliveryId);
      if (!isAuthorized) {
        return { error: "Passcode verification required to reply to feedback." };
      }
      if (delivery && delivery.isCommentAllowed === false) {
        return { error: "Comments are disabled for this delivery cut." };
      }
    } else {
      if (!user) {
        return { error: "Unauthorized. Authentication or delivery share token required." };
      }
    }

    const reply = await adminServices.feedback.addReply({
      feedbackId,
      authorUserId: user?.id,
      authorName: authorName || (user?.email ? user.email.split("@")[0] : "Client Guest"),
      commentText,
    });

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, reply };
  } catch (err: any) {
    return { error: err.message || "Failed to add reply." };
  }
}

/**
 * Helper to verify mutation permission (delete/update) for feedback or reply
 */
async function verifyFeedbackMutationPermission(shareToken?: string, deliveryId?: string) {
  const { isAuthorized, delivery, user, adminServices } = await verifyDeliveryAccessContext(shareToken, deliveryId);

  if (delivery && user) {
    const isMember = await adminServices.member.isMember(delivery.workspaceId, user.id).catch(() => false);
    if (isMember) {
      return { allowed: true, delivery, user, adminServices };
    }
  }

  if (isAuthorized) {
    return { allowed: true, delivery, user, adminServices };
  }

  try {
    const { user: authedUser } = await requireUser();
    const targetDelivery = delivery || (deliveryId ? await adminServices.delivery.getDeliveryById(deliveryId) : null);
    if (targetDelivery) {
      const isMember = await adminServices.member.isMember(targetDelivery.workspaceId, authedUser.id).catch(() => false);
      if (isMember) {
        return { allowed: true, delivery: targetDelivery, user: authedUser, adminServices };
      }
    }
  } catch {
    // not logged in
  }

  return { allowed: false, delivery, user, adminServices };
}

export async function deleteFeedbackReplyAction(replyId: string, shareToken?: string, deliveryId?: string) {
  try {
    if (!replyId?.trim()) return { error: "Reply ID is required." };

    const { allowed, adminServices } = await verifyFeedbackMutationPermission(shareToken, deliveryId);
    if (!allowed) {
      return { error: "Unauthorized to delete feedback reply." };
    }

    await adminServices.feedback.deleteReply(replyId.trim());

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete reply." };
  }
}

export async function updateFeedbackReplyAction(params: UpdateFeedbackReplyInput) {
  try {
    const validated = safeValidate(updateFeedbackReplySchema, params);
    if (!validated.success) {
      return { error: validated.error };
    }

    const { replyId, commentText, shareToken, deliveryId } = validated.data;
    const { allowed, adminServices } = await verifyFeedbackMutationPermission(shareToken, deliveryId);
    if (!allowed) {
      return { error: "Unauthorized to update reply." };
    }

    const reply = await adminServices.feedback.updateReply(replyId.trim(), commentText.trim());

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, reply };
  } catch (err: any) {
    return { error: err.message || "Failed to update reply." };
  }
}

export async function toggleFeedbackResolvedAction(feedbackId: string, isResolved: boolean, shareToken?: string, deliveryId?: string) {
  try {
    const validated = safeValidate(toggleFeedbackResolvedSchema, {
      feedbackId,
      isResolved,
      shareToken,
      deliveryId,
    });
    if (!validated.success) {
      return { error: validated.error };
    }

    const { isAuthorized, adminServices } = await verifyDeliveryAccessContext(
      validated.data.shareToken,
      validated.data.deliveryId
    );
    if (!isAuthorized) {
      return { error: "Unauthorized: Passcode or workspace membership required." };
    }

    const feedback = await adminServices.feedback.toggleResolved(
      validated.data.feedbackId,
      validated.data.isResolved
    );

    if (validated.data.shareToken) {
      revalidatePath(`/deliver/${validated.data.shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    return { success: true, feedback };
  } catch (err: any) {
    return { error: err.message || "Failed to toggle feedback status." };
  }
}

export async function updateFeedbackAction(params: UpdateFeedbackInput) {
  try {
    const validated = safeValidate(updateFeedbackSchema, params);
    if (!validated.success) {
      return { error: validated.error };
    }

    const { feedbackId, commentText, shareToken, deliveryId } = validated.data;
    const { allowed, adminServices } = await verifyFeedbackMutationPermission(shareToken, deliveryId);
    if (!allowed) {
      return { error: "Unauthorized to update feedback." };
    }

    const feedback = await adminServices.feedback.updateFeedback(feedbackId.trim(), commentText.trim());

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, feedback };
  } catch (err: any) {
    return { error: err.message || "Failed to update feedback." };
  }
}

export async function deleteFeedbackAction(feedbackId: string, shareToken?: string, deliveryId?: string) {
  try {
    if (!feedbackId?.trim()) return { error: "Feedback ID is required." };

    const { allowed, adminServices } = await verifyFeedbackMutationPermission(shareToken, deliveryId);
    if (!allowed) {
      return { error: "Unauthorized to delete feedback." };
    }

    await adminServices.feedback.deleteFeedback(feedbackId.trim());

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete feedback." };
  }
}
