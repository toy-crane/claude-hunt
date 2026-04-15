"use server";

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
 * Previous screenshot cleanup is best-effort: storage errors must not
 * fail the user-visible save (spec invariant).
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

  let previousScreenshotPath: string | null = null;
  if (input.screenshotPath) {
    const { data: current } = await supabase
      .from("projects")
      .select("screenshot_path")
      .eq("id", input.projectId)
      .maybeSingle();
    previousScreenshotPath = current?.screenshot_path ?? null;
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

  if (
    input.screenshotPath &&
    previousScreenshotPath &&
    previousScreenshotPath !== input.screenshotPath
  ) {
    await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .remove([previousScreenshotPath]);
  }

  revalidatePath("/");
  return { ok: true };
}
