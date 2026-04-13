"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";
import { type SubmitProjectInput, submitProjectInputSchema } from "./schema.ts";

export interface SubmitProjectResult {
  error?: string;
  ok: boolean;
  projectId?: string;
}

/**
 * Server action: inserts a row in `public.projects` using the signed-in
 * user's `cohort_id`. Rejects early if the actor is signed out or has
 * no cohort assignment (defence-in-depth against UI bypass).
 */
export async function submitProject(
  raw: SubmitProjectInput
): Promise<SubmitProjectResult> {
  const parsed = submitProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues.at(0);
    return { ok: false, error: first?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: "You must be signed in to submit a project" };
  }

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
      screenshot_path: input.screenshotPath,
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
