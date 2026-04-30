"use server";

import type { ProjectImage } from "@entities/project";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath } from "next/cache";
import { type EditProjectInput, editProjectInputSchema } from "./schema";

export interface EditProjectResult {
  error?: string;
  ok: boolean;
}

/**
 * RLS authorizes the UPDATE (ownership), so spoofed ids return 0 rows.
 * Diffs old vs. new images and best-effort removes orphaned storage
 * objects — failures must not fail the user-visible save.
 */
export async function editProject(
  raw: EditProjectInput
): Promise<EditProjectResult> {
  const parsed = editProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: getZodErrorMessage(parsed.error, "Invalid input"),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("You must be signed in to edit a project");
  if (!auth.ok) {
    return auth;
  }
  const { supabase } = auth;

  // Read the current images so we can diff and remove orphans.
  const { data: current } = await supabase
    .from("projects")
    .select("images, screenshot_path")
    .eq("id", input.projectId)
    .maybeSingle();
  const previousPaths = new Set<string>();
  if (Array.isArray(current?.images)) {
    for (const img of current.images as unknown as ProjectImage[]) {
      if (img && typeof img.path === "string") {
        previousPaths.add(img.path);
      }
    }
  }
  if (current?.screenshot_path) {
    previousPaths.add(current.screenshot_path);
  }

  const nextPaths = new Set(input.imagePaths);

  const { data, error } = await supabase
    .from("projects")
    .update({
      title: input.title,
      tagline: input.tagline,
      project_url: input.projectUrl,
      github_url: input.githubUrl ?? null,
      images: input.imagePaths.map((path) => ({ path })),
    })
    .eq("id", input.projectId)
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "Project not found or you don't have permission to edit it",
    };
  }

  // Best-effort: remove storage objects that no longer appear in the
  // saved image list.
  const orphans = [...previousPaths].filter((p) => !nextPaths.has(p));
  if (orphans.length > 0) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove(orphans);
  }

  revalidatePath("/");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}
