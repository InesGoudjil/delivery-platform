"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";

export interface AddFeedbackParams {
  assetVersionId: string;
  authorName?: string;
  commentText: string;
  timestampSeconds?: number;
  parentId?: string;
  shareToken?: string;
  deliveryId?: string;
}

export async function addFeedbackAction(params: AddFeedbackParams) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    // Verify passcode access if protected shareToken is passed
    if (params.shareToken) {
      const delivery = await services.delivery.getDeliveryByShareToken(params.shareToken);
      if (delivery?.passcodeHash) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const access = cookieStore.get(`delivery_access_${params.shareToken}`)?.value;
        const isMember = user ? await services.member.isMember(delivery.workspaceId, user.id).catch(() => false) : false;
        if (access !== "verified" && !isMember) {
          return { error: "Passcode verification required to leave feedback on this cut." };
        }
      }
    }

    const feedback = await services.feedback.addFeedback({
      assetVersionId: params.assetVersionId,
      authorUserId: user?.id,
      authorName: params.authorName || (user?.email ? user.email.split("@")[0] : "Client Guest"),
      commentText: params.commentText,
      timestampSeconds: params.timestampSeconds,
      parentId: params.parentId,
    });

    if (params.shareToken) {
      revalidatePath(`/deliver/${params.shareToken}`);
    }
    if (params.deliveryId) {
      revalidatePath(`/deliveries/${params.deliveryId}`);
    }
    return { success: true, feedback };
  } catch (err: any) {
    return { error: err.message || "Failed to add feedback." };
  }
}

export async function toggleFeedbackResolvedAction(feedbackId: string, isResolved: boolean, shareToken?: string, deliveryId?: string) {
  try {
    const services = await getServerServices();
    const feedback = await services.feedback.toggleResolved(feedbackId, isResolved);

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    if (deliveryId) {
      revalidatePath(`/deliveries/${deliveryId}`);
    }
    return { success: true, feedback };
  } catch (err: any) {
    return { error: err.message || "Failed to toggle feedback status." };
  }
}

export async function deleteFeedbackAction(feedbackId: string, shareToken?: string, deliveryId?: string) {
  try {
    const services = await getServerServices();
    await services.feedback.deleteFeedback(feedbackId);

    if (shareToken) {
      revalidatePath(`/deliver/${shareToken}`);
    }
    if (deliveryId) {
      revalidatePath(`/deliveries/${deliveryId}`);
    }
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete feedback." };
  }
}
