"use server";

import { PROJECT_URL_UNREACHABLE_MESSAGE } from "@entities/project";
import {
  captureProjectFirstScreen,
  discardCapturedImage,
  startProjectHighlights,
} from "@entities/project/server";
import type { CaptureSession } from "@shared/api/capture-browser/session";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { type SubmitProjectInput, submitProjectInputSchema } from "./schema";

export interface SubmitProjectResult {
  error?: string;
  /** Set when the error belongs next to one form field. */
  field?: "projectUrl";
  ok: boolean;
  projectId?: string;
}

export async function submitProject(
  raw: SubmitProjectInput
): Promise<SubmitProjectResult> {
  const parsed = submitProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: getZodErrorMessage(parsed.error, "입력한 내용을 확인해 주세요."),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("로그인 후 프로젝트를 제출할 수 있어요.");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, userId } = auth;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cohort_id")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return {
      ok: false,
      error: "프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
  if (!profile.cohort_id) {
    return {
      ok: false,
      error: "아직 클래스에 배정되지 않았어요. 강사에게 문의해 주세요.",
    };
  }

  // No uploaded images: the project's first screen becomes the primary
  // image, and publishing waits for it (project-publishing decision).
  let imagePaths = input.imagePaths;
  let session: CaptureSession | null = null;
  if (imagePaths.length === 0) {
    const captured = await captureProjectFirstScreen({
      projectUrl: input.projectUrl,
      userId,
    });
    if (!captured.ok) {
      return {
        ok: false,
        field: "projectUrl",
        error: PROJECT_URL_UNREACHABLE_MESSAGE,
      };
    }
    imagePaths = [captured.path];
    session = captured.session;
  }
  const images = imagePaths.map((path) => ({ path }));

  const { data: inserted, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      cohort_id: profile.cohort_id,
      title: input.title,
      tagline: input.tagline,
      description: input.description ?? null,
      project_url: input.projectUrl,
      github_url: input.githubUrl ?? null,
      images,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    if (session) {
      await discardCapturedImage(imagePaths[0] as string);
      // Shutting the sandbox down takes ~25s; do it after the response.
      const unused = session;
      after(() => unused.close());
    }
    return {
      ok: false,
      error:
        insertError?.message ??
        "프로젝트를 제출하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (session) {
    const liveSession = session;
    after(() =>
      startProjectHighlights({
        session: liveSession,
        projectId: inserted.id,
        userId,
        project: { title: input.title, tagline: input.tagline },
        images,
      })
    );
  }

  updateTag(CACHE_TAGS.PROJECTS);
  // Mirror delete/edit: the /settings 내 프로젝트 list reads via
  // fetchMyProjects, which is uncached and untagged, so the PROJECTS
  // tag does not reach it. Revalidate the path so a project submitted from
  // the settings → 새 프로젝트 flow shows up on return without a hard refresh.
  revalidatePath("/settings");
  return { ok: true, projectId: inserted.id };
}
