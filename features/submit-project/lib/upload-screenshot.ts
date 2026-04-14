import { createClient } from "@shared/api/supabase/client";
import { downscaleImage } from "@shared/lib/image";
import { validateScreenshotFile } from "../api/schema";

export interface UploadScreenshotResult {
  error?: string;
  path?: string;
}

/**
 * Uploads a screenshot directly from the browser to the
 * `project-screenshots` bucket using the user's authenticated session.
 *
 * Pipeline:
 *   1. Client-side size + MIME validation (before decode).
 *   2. Client-side downscale + re-encode to WebP (longest side ≤ 1920 px).
 *   3. Storage upload under `<user_id>/<uuid>.webp` so ownership is
 *      derivable and collisions can't occur across users.
 *
 * Returns the stored object path on success, or a user-facing error
 * message on failure (validation, decode, or storage errors all
 * surface here).
 */
export async function uploadScreenshot(
  file: File
): Promise<UploadScreenshotResult> {
  const check = validateScreenshotFile(file);
  if (!check.ok) {
    return { error: check.error };
  }

  const downscale = await downscaleImage(file);
  if (!downscale.ok) {
    return { error: downscale.error };
  }
  const outputFile = downscale.file;

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "You must be signed in to upload a screenshot" };
  }

  const path = `${user.id}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from("project-screenshots")
    .upload(path, outputFile, {
      contentType: outputFile.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }
  return { path };
}
