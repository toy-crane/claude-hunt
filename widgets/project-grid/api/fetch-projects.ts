import type { ProjectWithVoteCount } from "@entities/vote";
import { createClient } from "@shared/api/supabase/server";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";

export interface FetchProjectsOptions {
  /**
   * When set, a parallel query pulls the viewer's votes so each returned
   * row can expose a `viewer_has_voted` flag. Null means anonymous.
   */
  viewerUserId?: string | null;
}

export type ProjectGridRow = ProjectWithVoteCount & {
  screenshotUrl: string;
  viewer_has_voted: boolean;
};

/**
 * Reads the landing-page grid rows from `projects_with_vote_count` and
 * resolves each row's screenshot path to a public URL. When a
 * `viewerUserId` is supplied, the viewer's vote rows are fetched in
 * parallel and merged as a `viewer_has_voted` flag. Ordering is
 * vote-count-desc, tiebroken by `created_at` so paging is stable.
 */
export async function fetchProjects(
  options: FetchProjectsOptions = {}
): Promise<ProjectGridRow[]> {
  const supabase = await createClient();
  const projectsQuery = supabase
    .from("projects_with_vote_count")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  const votesPromise = options.viewerUserId
    ? supabase
        .from("votes")
        .select("project_id")
        .eq("user_id", options.viewerUserId)
    : Promise.resolve({ data: null, error: null });

  const [projectsResult, votesResult] = await Promise.all([
    projectsQuery,
    votesPromise,
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }

  let votedProjectIds: Set<string> = new Set();
  if (votesResult.data) {
    votedProjectIds = new Set(
      votesResult.data.map(
        (v: { project_id: string | null }) => v.project_id ?? ""
      )
    );
  }

  const rows = projectsResult.data ?? [];
  const screenshots = supabase.storage.from(SCREENSHOT_BUCKET);
  return rows.map((row) => ({
    ...row,
    screenshotUrl: row.screenshot_path
      ? screenshots.getPublicUrl(row.screenshot_path).data.publicUrl
      : "",
    viewer_has_voted: row.id != null && votedProjectIds.has(row.id),
  }));
}
