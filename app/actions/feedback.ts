"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SupabaseFeedbackRepository } from "@/infrastructure/repositories/supabase-feedback.repository";
import { AddTimecodedFeedbackUseCase } from "@/core/use-cases/feedback/add-feedback.use-case";

export interface AddFeedbackParams {
  assetVersionId: string;
  authorName?: string;
  commentText: string;
  timestampSeconds?: number;
  parentId?: string;
}

export async function addFeedbackAction(params: AddFeedbackParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const feedbackRepo = new SupabaseFeedbackRepository(supabase);
    const useCase = new AddTimecodedFeedbackUseCase(feedbackRepo);

    const feedback = await useCase.execute({
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
