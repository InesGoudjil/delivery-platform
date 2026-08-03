"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProjectAction(formData: FormData) {
  const supabase = await createClient();
  const title = formData.get("title");
  const clientName = formData.get("client");

  if (!title || typeof title !== "string") {
    return { error: "Project title is required." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User is not authenticated." };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        user_id: user.id,
        title: title.trim(),
        client_name: (typeof clientName === "string" ? clientName : "Unassigned").trim(),
        status: "draft",
        project_type: "film",
      },
    ])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, project: data };
}

export async function approveCutAction(projectId: string, versionId?: string) {
  const supabase = await createClient();

  if (versionId) {
    await supabase
      .from("video_versions")
      .update({ is_approved: true })
      .eq("id", versionId);
  }

  const { error } = await supabase
    .from("projects")
    .update({ status: "delivered" })
    .eq("id", projectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/deliver/${projectId}`);
  return { success: true };
}

export interface AddCommentParams {
  projectId: string;
  versionId?: string;
  authorType?: "client" | "me";
  authorName?: string;
  content: string;
}

export async function addCommentAction({
  projectId,
  versionId,
  authorType = "client",
  authorName = "Client",
  content,
}: AddCommentParams) {
  const supabase = await createClient();

  if (!content || !content.trim()) {
    return { error: "Comment text cannot be empty." };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert([
      {
        project_id: projectId,
        version_id: versionId,
        author_type: authorType,
        author_name: authorName,
        content: content.trim(),
      },
    ])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/deliver/${projectId}`);
  return { success: true, comment: data };
}
