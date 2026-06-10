import { createBrowserClient } from "@shared/api/supabase/client";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { downscaleImage } from "./image";

export const MAX_SCREENSHOT_BYTES = 25 * 1024 * 1024; // 25 MiB
export const ALLOWED_SCREENSHOT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedScreenshotMime =
  (typeof ALLOWED_SCREENSHOT_MIME_TYPES)[number];

export interface ValidateScreenshotResult {
  error?: string;
  ok: boolean;
}

export function validateScreenshotFile(file: File): ValidateScreenshotResult {
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return { ok: false, error: "파일은 25MB까지 올릴 수 있어요." };
  }
  if (
    !ALLOWED_SCREENSHOT_MIME_TYPES.includes(file.type as AllowedScreenshotMime)
  ) {
    return {
      ok: false,
      error: "JPEG, PNG, WebP 이미지만 올릴 수 있어요.",
    };
  }
  return { ok: true };
}

export interface UploadScreenshotResult {
  error?: string;
  path?: string;
}

/**
 * Client-side pipeline: validate → downscale (longest side ≤ 1920 px) →
 * upload to `<user_id>/<uuid>.webp`. Path shape lets RLS key on the
 * authenticated user and keeps collisions impossible across accounts.
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

  const supabase = createBrowserClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data) {
    return { error: "로그인이 풀렸어요. 다시 로그인해 주세요." };
  }

  const path = `${data.claims.sub}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, outputFile, {
      contentType: outputFile.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }
  return { path };
}
