"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Creates a new project in Supabase for the authenticated filmmaker
 */
export async function createProjectAction(formData) {
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
        client_name: (clientName || "Unassigned").trim(),
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

/**
 * Approves a project cut (locking version and updating status to delivered)
 */
export async function approveCutAction(projectId, versionId) {
  const supabase = await createClient();

  // Update version approval flag
  if (versionId) {
    await supabase
      .from("video_versions")
      .update({ is_approved: true })
      .eq("id", versionId);
  }

  // Update overall project status to delivered
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

/**
 * Adds a new comment (client feedback or filmmaker response)
 */
export async function addCommentAction({ projectId, versionId, authorType, authorName, content }) {
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
        author_type: authorType || "client",
        author_name: authorName || "Client",
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
