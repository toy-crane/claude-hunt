"use server";

import {
  PROJECT_URL_UNREACHABLE_MESSAGE,
  type ProjectImage,
} from "@entities/project";
import {
  captureProjectFirstScreen,
  discardCapturedImage,
  startProjectHighlights,
} from "@entities/project/server";
import type { CaptureSession } from "@shared/api/capture-browser/session";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { type EditProjectInput, editProjectInputSchema } from "./schema";

export interface EditProjectResult {
  error?: string;
  /** Set when the error belongs next to one form field. */
  field?: "projectUrl";
  ok: boolean;
}

const NOT_OWNER_MESSAGE =
  "프로젝트를 편집하지 못했어요. 내가 제출한 프로젝트만 편집할 수 있어요.";

function imagePathsOf(images: unknown): Set<string> {
  const paths = new Set<string>();
  if (Array.isArray(images)) {
    for (const img of images as ProjectImage[]) {
      if (img && typeof img.path === "string") {
        paths.add(img.path);
      }
    }
  }
  return paths;
}

type ResolvedImages =
  | { ok: true; imagePaths: string[]; session: CaptureSession | null }
  | { ok: false };

/**
 * Saving with no images recaptures the project's first screen as the
 * primary image, and the save waits for it (project-publishing decision).
 */
async function resolveImagePaths(
  imagePaths: string[],
  projectUrl: string,
  userId: string
): Promise<ResolvedImages> {
  if (imagePaths.length > 0) {
    return { ok: true, imagePaths, session: null };
  }
  const captured = await captureProjectFirstScreen({ projectUrl, userId });
  if (!captured.ok) {
    return { ok: false };
  }
  return { ok: true, imagePaths: [captured.path], session: captured.session };
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
  const { supabase, userId } = auth;

  // Read the current images so we can diff and remove orphans.
  const { data: current } = await supabase
    .from("projects")
    .select("images, user_id")
    .eq("id", input.projectId)
    .maybeSingle();
  const previousPaths = imagePathsOf(current?.images);

  // Projects are publicly readable, so check ownership here before an
  // image-less save opens the URL in a sandbox; RLS only stops the UPDATE.
  if (input.imagePaths.length === 0 && current?.user_id !== userId) {
    return { ok: false, error: NOT_OWNER_MESSAGE };
  }

  const resolved = await resolveImagePaths(
    input.imagePaths,
    input.projectUrl,
    userId
  );
  if (!resolved.ok) {
    return {
      ok: false,
      field: "projectUrl",
      error: PROJECT_URL_UNREACHABLE_MESSAGE,
    };
  }
  const { imagePaths, session } = resolved;
  const images = imagePaths.map((path) => ({ path }));
  const nextPaths = new Set(imagePaths);

  const { data, error } = await supabase
    .from("projects")
    .update({
      title: input.title,
      tagline: input.tagline,
      description: input.description ?? null,
      project_url: input.projectUrl,
      github_url: input.githubUrl ?? null,
      images,
    })
    .eq("id", input.projectId)
    .select("id");

  if ((error || !data || data.length === 0) && session) {
    await discardCapturedImage(imagePaths[0] as string);
    // Shutting the sandbox down takes ~25s; do it after the response.
    const unused = session;
    after(() => unused.close());
  }
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: NOT_OWNER_MESSAGE };
  }

  // Best-effort: remove storage objects that no longer appear in the
  // saved image list.
  const orphans = [...previousPaths].filter((p) => !nextPaths.has(p));
  if (orphans.length > 0) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove(orphans);
  }

  if (session) {
    const liveSession = session;
    after(() =>
      startProjectHighlights({
        session: liveSession,
        projectId: input.projectId,
        userId,
        project: {
          title: input.title,
          tagline: input.tagline,
          description: input.description,
        },
        images,
      })
    );
  }

  updateTag(CACHE_TAGS.PROJECTS);
  // Same rationale as deleteProject — /settings reads via
  // fetchMyProjects which sits outside the PROJECTS tag, so an
  // explicit path revalidation is required for the user's own list
  // to reflect title/tagline/screenshot changes on next visit.
  revalidatePath("/settings");
  return { ok: true };
}
