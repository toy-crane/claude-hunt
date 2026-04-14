"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";
import { type EditProjectInput, editProjectInputSchema } from "./schema.ts";

export interface EditProjectResult {
  error?: string;
  ok: boolean;
}

const SCREENSHOT_BUCKET = "project-screenshots";

/**
 * Updates text fields (and optionally the screenshot_path) on a project
 * the signed-in user owns. RLS enforces ownership, so spoofed project
 * ids return 0 rows and we surface a "not found or forbidden" error.
 *
 * When the caller supplies a new screenshot path that differs from the
 * existing one, the previous stored image is removed after the row
 * update succeeds. Removal is best-effort: storage errors do not fail
 * the user-visible save.
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

  // When the user uploaded a new screenshot, read the existing path so we
  // can clean it up after the row update succeeds. Owner-only SELECT
  // isn't required (row is publicly readable); RLS on the UPDATE below
  // is what authorizes the change.
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

  // Best-effort cleanup of the superseded screenshot. Storage errors are
  // intentionally ignored so transient bucket issues don't fail the save
  // (spec invariant: non-blocking cleanup).
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
