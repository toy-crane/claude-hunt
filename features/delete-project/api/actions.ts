"use server";

import type { ProjectImage } from "@entities/project";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { revalidatePath, updateTag } from "next/cache";

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
    return {
      ok: false,
      error: "프로젝트를 삭제하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.",
    };
  }

  const auth = await requireAuth("로그인이 풀렸어요. 다시 로그인해 주세요.");
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
      error:
        "프로젝트를 삭제하지 못했어요. 내가 제출한 프로젝트만 삭제할 수 있어요.",
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

  updateTag(CACHE_TAGS.PROJECTS);
  // Invalidate the Next router cache for routes that fetch the user's
  // own project list outside the PROJECTS tag (e.g. /settings'
  // 내 프로젝트 section reads via fetchMyProjects, which is uncached
  // and untagged).
  revalidatePath("/settings");
  return { ok: true };
}
