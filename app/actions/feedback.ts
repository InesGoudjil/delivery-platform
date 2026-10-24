"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerServices, getServerAdminServices } from "@/core/server";
import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import {
  addFeedbackSchema,
  addFeedbackReplySchema,
  toggleFeedbackResolvedSchema,
  safeValidate,
  type AddFeedbackInput,
  type AddFeedbackReplyInput,
} from "@/lib/validations";

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
    const access = cookieStore.get(`delivery_access_${delivery.shareToken}`)?.value;
    if (access === "verified") {
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
    } = validated.data;

    const adminServices = await getServerAdminServices();
    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    // Verify access
    if (shareToken) {
      const { isAuthorized } = await verifyDeliveryAccessContext(shareToken);
      if (!isAuthorized) {
        return { error: "Passcode verification required to leave feedback on this cut." };
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

    const { feedbackId, commentText, authorName, shareToken } = validated.data;

    const adminServices = await getServerAdminServices();
    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    // Verify access
    if (shareToken) {
      const { isAuthorized } = await verifyDeliveryAccessContext(shareToken);
      if (!isAuthorized) {
        return { error: "Passcode verification required to reply to feedback." };
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

export async function deleteFeedbackReplyAction(replyId: string, shareToken?: string, deliveryId?: string) {
  try {
    if (!replyId?.trim()) return { error: "Reply ID is required." };

    const { isAuthorized, adminServices } = await verifyDeliveryAccessContext(shareToken, deliveryId);
    if (!isAuthorized) {
      // Must be authenticated workspace member
      const { user } = await requireUser();
      const isMember = deliveryId ? await adminServices.member.isMember(deliveryId, user.id).catch(() => false) : false;
      if (!isMember) {
        return { error: "Unauthorized to delete feedback reply." };
      }
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

export async function deleteFeedbackAction(feedbackId: string, shareToken?: string, deliveryId?: string) {
  try {
    if (!feedbackId?.trim()) return { error: "Feedback ID is required." };

    const { isAuthorized, adminServices } = await verifyDeliveryAccessContext(shareToken, deliveryId);
    if (!isAuthorized) {
      const { user } = await requireUser();
      const isMember = deliveryId ? await adminServices.member.isMember(deliveryId, user.id).catch(() => false) : false;
      if (!isMember) {
        return { error: "Unauthorized to delete feedback." };
      }
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
