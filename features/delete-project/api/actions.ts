"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";

export interface DeleteProjectResult {
  error?: string;
  ok: boolean;
}

/**
 * Deletes a project row the signed-in user owns and, best-effort, the
 * screenshot in storage. RLS is authoritative on the row delete — a
 * spoofed projectId just returns 0 rows and we surface a forbidden
 * error. Storage removal is best-effort: we ignore storage errors so a
 * missing/cleaned object doesn't block row deletion.
 */
export async function deleteProject(
  projectId: string
): Promise<DeleteProjectResult> {
  if (!projectId || typeof projectId !== "string") {
    return { ok: false, error: "Invalid project id" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: "You must be signed in to delete a project" };
  }

  // Look up the screenshot path first so we can clean it up after the
  // row delete succeeds. Owner-only SELECT isn't required (row is
  // publicly readable), but RLS on the subsequent DELETE enforces
  // ownership.
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
      .from("project-screenshots")
      .remove([project.screenshot_path]);
  }

  revalidatePath("/");
  return { ok: true };
}
