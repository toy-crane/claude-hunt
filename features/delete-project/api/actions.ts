"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { revalidatePath } from "next/cache";

export interface DeleteProjectResult {
  error?: string;
  ok: boolean;
}

/**
 * RLS gates the DELETE, so a spoofed projectId returns 0 rows and
 * surfaces as a forbidden error. Storage removal is best-effort: a
 * missing/cleaned object must not block row deletion.
 */
export async function deleteProject(
  projectId: string
): Promise<DeleteProjectResult> {
  if (!projectId || typeof projectId !== "string") {
    return { ok: false, error: "Invalid project id" };
  }

  const auth = await requireAuth("You must be signed in to delete a project");
  if (!auth.ok) {
    return auth;
  }
  const { supabase } = auth;

  const { data: project } = await supabase
    .from("projects")
    .select("screenshot_path")
    .eq("id", projectId)
    .maybeSingle();

  const { data: deleted, error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .select("id");

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }
  if (!deleted || deleted.length === 0) {
    return {
      ok: false,
      error: "Project not found or you don't have permission to delete it",
    };
  }

  if (project?.screenshot_path) {
    await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .remove([project.screenshot_path]);
  }

  revalidatePath("/");
  return { ok: true };
}
