import type { Database } from "@shared/api/supabase/types";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Maps project rows to a `screenshotUrl` resolved from the screenshot
 * bucket's public URL. `primary_image_path` is the view's pre-extracted
 * first image path; an empty string means "no screenshot" so callers can
 * fall back to a placeholder without an extra guard.
 *
 * Single source for the `getPublicUrl` mapping shared by the project grid,
 * the winner spotlight, and the settings "내 프로젝트" list — change the
 * bucket access pattern (signed URLs, CDN transform, …) here once.
 */
export function withScreenshotUrls<
  T extends { primary_image_path: string | null },
>(
  supabase: SupabaseClient<Database>,
  rows: T[]
): (T & { screenshotUrl: string })[] {
  const bucket = supabase.storage.from(SCREENSHOT_BUCKET);
  return rows.map((row) => ({
    ...row,
    screenshotUrl: row.primary_image_path
      ? bucket.getPublicUrl(row.primary_image_path).data.publicUrl
      : "",
  }));
}
