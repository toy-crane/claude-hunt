import type { ProjectWithVoteCount } from "@entities/vote";
import { createClient } from "@shared/api/supabase/server";
import { withScreenshotUrls } from "@shared/lib/screenshot-url";

/**
 * Columns the settings 내 프로젝트 row actually reads. Selecting only
 * these avoids transferring the `images` jsonb (the full per-project
 * screenshot list) and unused author/cohort metadata on every page
 * load. `primary_image_path` is the view's pre-extracted first image
 * — enough for the 48×27 / 40×40 thumbnail without parsing the array.
 */
const SELECT_COLUMNS =
  "id, title, tagline, primary_image_path, created_at, vote_count" as const;

export type MyProjectRow = Pick<
  ProjectWithVoteCount,
  | "id"
  | "title"
  | "tagline"
  | "primary_image_path"
  | "created_at"
  | "vote_count"
> & {
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
    .select(SELECT_COLUMNS)
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return withScreenshotUrls(supabase, data ?? []);
}
