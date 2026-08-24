"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";

export interface AddFeedbackParams {
  assetVersionId: string;
  authorName?: string;
  commentText: string;
  timestampSeconds?: number;
  parentId?: string;
}

export async function addFeedbackAction(params: AddFeedbackParams) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    const feedback = await services.feedback.addFeedback({
      assetVersionId: params.assetVersionId,
      authorUserId: user?.id,
      authorName: params.authorName || (user?.email ? user.email.split("@")[0] : "Client Guest"),
      commentText: params.commentText,
      timestampSeconds: params.timestampSeconds,
      parentId: params.parentId,
    });

    revalidatePath("/deliver/[id]");
    return { success: true, feedback };
  } catch (err: any) {
    return { error: err.message || "Failed to add feedback." };
  }
}
