"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import {
  addFeedbackSchema,
  addFeedbackReplySchema,
  toggleFeedbackResolvedSchema,
  safeValidate,
  type AddFeedbackInput,
  type AddFeedbackReplyInput,
} from "@/lib/validations";

export type AddFeedbackParams = AddFeedbackInput;
export type AddFeedbackReplyParams = AddFeedbackReplyInput;

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

    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    // Verify passcode access if protected shareToken is passed
    if (shareToken) {
      const delivery = await services.delivery.getDeliveryByShareToken(shareToken);
      if (delivery?.passcodeHash) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const access = cookieStore.get(`delivery_access_${shareToken}`)?.value;
        const isMember = user ? await services.member.isMember(delivery.workspaceId, user.id).catch(() => false) : false;
        if (access !== "verified" && !isMember) {
          return { error: "Passcode verification required to leave feedback on this cut." };
        }
      }
    }

    // If a parentId is provided, delegate to addReply for backward compatibility
    if (parentId) {
      const reply = await services.feedback.addReply({
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

    const feedback = await services.feedback.addFeedback({
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

    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    // Verify passcode access if protected shareToken is passed
    if (shareToken) {
      const delivery = await services.delivery.getDeliveryByShareToken(shareToken);
      if (delivery?.passcodeHash) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const access = cookieStore.get(`delivery_access_${shareToken}`)?.value;
        const isMember = user ? await services.member.isMember(delivery.workspaceId, user.id).catch(() => false) : false;
        if (access !== "verified" && !isMember) {
          return { error: "Passcode verification required to reply to feedback." };
        }
      }
    }

    const reply = await services.feedback.addReply({
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

    const services = await getServerServices();
    await services.feedback.deleteReply(replyId.trim());

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

    const services = await getServerServices();
    const feedback = await services.feedback.toggleResolved(
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

    const services = await getServerServices();
    await services.feedback.deleteFeedback(feedbackId.trim());

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
