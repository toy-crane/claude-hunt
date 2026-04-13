import type { ProjectWithVoteCount } from "@entities/vote/index.ts";
import { createClient } from "@shared/api/supabase/server.ts";

export interface FetchProjectsOptions {
  cohortId?: string | null;
  /**
   * When set, a second query pulls the viewer's votes so each returned
   * row can expose a `viewer_has_voted` flag. Null means anonymous.
   */
  viewerUserId?: string | null;
}

export type ProjectGridRow = ProjectWithVoteCount & {
  viewer_has_voted: boolean;
};

/**
 * Reads the landing-page grid rows from `projects_with_vote_count` (a
 * definer-mode view that exposes each project joined with its author's
 * public display fields and the aggregated vote count). Rows are sorted
 * vote-count-descending; ties are broken by `created_at` so the ordering
 * is stable. When a `viewerUserId` is supplied, each row is enriched
 * with `viewer_has_voted` via a second query (the view can't embed
 * per-viewer state).
 */
export async function fetchProjects(
  options: FetchProjectsOptions = {}
): Promise<ProjectGridRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("projects_with_vote_count")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.cohortId) {
    query = query.eq("cohort_id", options.cohortId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  const rows = data ?? [];

  let votedProjectIds: Set<string> = new Set();
  if (options.viewerUserId) {
    const { data: votes } = await supabase
      .from("votes")
      .select("project_id")
      .eq("user_id", options.viewerUserId);
    if (votes) {
      votedProjectIds = new Set(
        votes.map((v: { project_id: string | null }) => v.project_id ?? "")
      );
    }
  }

  return rows.map((row) => ({
    ...row,
    viewer_has_voted: row.id != null && votedProjectIds.has(row.id),
  }));
}
