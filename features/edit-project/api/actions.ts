"use server";

import type { ProjectImage } from "@entities/project";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath, updateTag } from "next/cache";
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
      error: getZodErrorMessage(parsed.error, "입력한 내용을 확인해 주세요."),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("로그인이 풀렸어요. 다시 로그인해 주세요.");
  if (!auth.ok) {
    return auth;
  }
  const { supabase } = auth;

  // Read the current images so we can diff and remove orphans.
  const { data: current } = await supabase
    .from("projects")
    .select("images")
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

  const nextPaths = new Set(input.imagePaths);

  const { data, error } = await supabase
    .from("projects")
    .update({
      title: input.title,
      tagline: input.tagline,
      description: input.description ?? null,
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
      error:
        "프로젝트를 편집하지 못했어요. 내가 제출한 프로젝트만 편집할 수 있어요.",
    };
  }

  // Best-effort: remove storage objects that no longer appear in the
  // saved image list.
  const orphans = [...previousPaths].filter((p) => !nextPaths.has(p));
  if (orphans.length > 0) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove(orphans);
  }

  updateTag(CACHE_TAGS.PROJECTS);
  // Same rationale as deleteProject — /settings reads via
  // fetchMyProjects which sits outside the PROJECTS tag, so an
  // explicit path revalidation is required for the user's own list
  // to reflect title/tagline/screenshot changes on next visit.
  revalidatePath("/settings");
  return { ok: true };
}
