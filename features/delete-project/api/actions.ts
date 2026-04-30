"use server";

import type { ProjectImage } from "@entities/project";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { revalidatePath } from "next/cache";

export interface DeleteProjectInput {
  projectId: string;
}

export interface DeleteProjectResult {
  error?: string;
  ok: boolean;
}

/**
 * RLS gates the DELETE, so a spoofed projectId returns 0 rows and
 * surfaces as a forbidden error. Storage removal is best-effort: a
 * missing/cleaned object must not block row deletion. Removes every
 * path in `images[]`.
 */
export async function deleteProject(
  input: DeleteProjectInput
): Promise<DeleteProjectResult> {
  const projectId = input.projectId;
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
    .select("images")
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

  const orphans = new Set<string>();
  if (Array.isArray(project?.images)) {
    for (const img of project.images as unknown as ProjectImage[]) {
      if (img && typeof img.path === "string") {
        orphans.add(img.path);
      }
    }
  }
  if (orphans.size > 0) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([...orphans]);
  }

  revalidatePath("/");
  return { ok: true };
}
