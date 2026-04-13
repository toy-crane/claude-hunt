import type { ProjectWithVoteCount } from "@entities/vote/index.ts";
import { createClient } from "@shared/api/supabase/server.ts";

export interface FetchProjectsOptions {
  cohortId?: string | null;
}

/**
 * Reads the landing-page grid rows from `projects_with_vote_count` (a
 * definer-mode view that exposes each project joined with its author's
 * public display fields and the aggregated vote count). Rows are sorted
 * vote-count-descending; ties are broken by `created_at` so the ordering
 * is stable.
 */
export async function fetchProjects(
  options: FetchProjectsOptions = {}
): Promise<ProjectWithVoteCount[]> {
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
  return data ?? [];
}
