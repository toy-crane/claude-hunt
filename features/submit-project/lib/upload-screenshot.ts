import { createClient } from "@shared/api/supabase/client.ts";
import { validateScreenshotFile } from "../api/schema.ts";

export interface UploadScreenshotResult {
  error?: string;
  path?: string;
}

/**
 * Uploads a screenshot directly from the browser to the
 * `project-screenshots` bucket using the user's authenticated session.
 * Object path is `<user_id>/<uuid>.<ext>` so ownership is derivable and
 * collisions can't occur across users.
 *
 * Returns the stored object path on success, or a user-facing error
 * message on failure (validation + storage errors both surface here).
 */
export async function uploadScreenshot(
  file: File
): Promise<UploadScreenshotResult> {
  const check = validateScreenshotFile(file);
  if (!check.ok) {
    return { error: check.error };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "You must be signed in to upload a screenshot" };
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const path = `${user.id}/${crypto.randomUUID()}${extension}`;

  const { error } = await supabase.storage
    .from("project-screenshots")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }
  return { path };
}
