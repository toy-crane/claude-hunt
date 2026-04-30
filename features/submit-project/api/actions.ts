"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath } from "next/cache";
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
      // screenshot_path stays null on new rows; the board view's
      // coalesce shim surfaces images[0] for new rows and falls back
      // to screenshot_path for legacy rows that haven't been
      // re-saved yet.
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

  revalidatePath("/");
  return { ok: true, projectId: inserted.id };
}
