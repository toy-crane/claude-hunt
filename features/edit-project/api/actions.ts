"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";
import { type EditProjectInput, editProjectInputSchema } from "./schema.ts";

export interface EditProjectResult {
  error?: string;
  ok: boolean;
}

/**
 * Updates text fields (and optionally the screenshot_path) on a project
 * the signed-in user owns. RLS enforces ownership, so spoofed project
 * ids return 0 rows and we surface a "not found or forbidden" error.
 */
export async function editProject(
  raw: EditProjectInput
): Promise<EditProjectResult> {
  const parsed = editProjectInputSchema.safeParse(raw);
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
    return { ok: false, error: "You must be signed in to edit a project" };
  }

  const update: Record<string, string> = {
    title: input.title,
    tagline: input.tagline,
    project_url: input.projectUrl,
  };
  if (input.screenshotPath) {
    update.screenshot_path = input.screenshotPath;
  }

  const { data, error } = await supabase
    .from("projects")
    .update(update)
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

  revalidatePath("/");
  return { ok: true };
}
