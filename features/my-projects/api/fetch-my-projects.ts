import type { ProjectWithVoteCount } from "@entities/vote";
import { createClient } from "@shared/api/supabase/server";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";

export type MyProjectRow = ProjectWithVoteCount & {
  screenshotUrl: string;
};

/**
 * Viewer-scoped read of the signed-in user's submitted projects. Used by
 * the settings page "내 프로젝트" section. Ordered newest first so the
 * most recently submitted project sits at the top.
 *
 * Not cached — the result is keyed by viewer.id, so a per-request fetch
 * stays cheap and avoids stale rows after submit/edit/delete.
 */
export async function fetchMyProjects(
  viewerId: string
): Promise<MyProjectRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects_with_vote_count")
    .select("*")
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const screenshots = supabase.storage.from(SCREENSHOT_BUCKET);
  return rows.map((row) => ({
    ...row,
    screenshotUrl: row.primary_image_path
      ? screenshots.getPublicUrl(row.primary_image_path).data.publicUrl
      : "",
  }));
}
