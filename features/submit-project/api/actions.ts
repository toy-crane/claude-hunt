"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath, updateTag } from "next/cache";
import { type SubmitProjectInput, submitProjectInputSchema } from "./schema";

export interface SubmitProjectResult {
  error?: string;
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
      error: getZodErrorMessage(parsed.error, "Invalid input"),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("You must be signed in to submit a project");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, user } = auth;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cohort_id")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "Could not load your profile" };
  }
  if (!profile.cohort_id) {
    return {
      ok: false,
      error:
        "Contact your instructor to get assigned to a cohort before submitting a project",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      cohort_id: profile.cohort_id,
      title: input.title,
      tagline: input.tagline,
      project_url: input.projectUrl,
      github_url: input.githubUrl ?? null,
      images: input.imagePaths.map((path) => ({ path })),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: insertError?.message ?? "Could not submit project",
    };
  }

  updateTag(CACHE_TAGS.PROJECTS_GRID);
  // Mirror delete/edit: the /settings 내 프로젝트 list reads via
  // fetchMyProjects, which is uncached and untagged, so the PROJECTS_GRID
  // tag does not reach it. Revalidate the path so a project submitted from
  // the settings → 새 프로젝트 flow shows up on return without a hard refresh.
  revalidatePath("/settings");
  return { ok: true, projectId: inserted.id };
}
