import type { ProjectWithVoteCount } from "@entities/vote";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { createServerClient } from "@shared/api/supabase/server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { withScreenshotUrls } from "@shared/lib/screenshot-url";
import { cacheLife, cacheTag } from "next/cache";

export interface FetchProjectsOptions {
  /**
   * When set, a parallel query pulls the viewer's votes so each returned
   * row can expose a `viewer_has_voted` flag. Null means anonymous.
   */
  viewerUserId?: string | null;
}

/** Viewer-agnostic shape — the grid row before the viewer-vote overlay. */
export type ProjectGridCore = ProjectWithVoteCount & {
  screenshotUrl: string;
};

export type ProjectGridRow = ProjectGridCore & {
  viewer_has_voted: boolean;
};

/** Narrow row shape consumed by `app/opengraph-image.tsx`. No viewer-vote merge. */
export type TopProjectRow = ProjectGridCore;

export interface FetchTopProjectsOptions {
  limit?: number;
}

/**
 * Cached read of the landing-page grid rows. Tagged with `projects` so
 * mutations invalidate it via `updateTag`; `cacheLife("minutes")` is a
 * safety net behind the tag. Uses the anonymous client so the entry stays
 * cookie-free and can be reused across requests under `use cache`.
 */
async function fetchProjectGridCore(): Promise<ProjectGridCore[]> {
  "use cache";
  cacheTag(CACHE_TAGS.PROJECTS);
  cacheLife("minutes");

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects_with_vote_count")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return withScreenshotUrls(supabase, data ?? []);
}

/**
 * Returns the set of project ids the viewer has voted on. Caller is
 * expected to short-circuit to an empty set when no viewer is signed in.
 * Not cached across requests — votes change per user.
 */
async function fetchViewerVotedIds(viewerUserId: string): Promise<Set<string>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("votes")
    .select("project_id")
    .eq("user_id", viewerUserId);

  if (error) {
    throw error;
  }
  const voted = new Set<string>();
  for (const v of data ?? []) {
    if (v.project_id != null) {
      voted.add(v.project_id);
    }
  }
  return voted;
}

/**
 * Composes the cached, viewer-agnostic grid core with the viewer's votes
 * overlay. Public signature is preserved for the existing callers (home
 * page, project-board, e2e).
 */
export async function fetchProjects(
  options: FetchProjectsOptions = {}
): Promise<ProjectGridRow[]> {
  const [rows, votedIds] = await Promise.all([
    fetchProjectGridCore(),
    options.viewerUserId
      ? fetchViewerVotedIds(options.viewerUserId)
      : Promise.resolve(new Set<string>()),
  ]);

  return rows.map((row) => ({
    ...row,
    viewer_has_voted: row.id != null && votedIds.has(row.id),
  }));
}

/**
 * Cookie-free, cached top-N used by the root OG image. Tagged `projects`
 * (busted by project mutations); the hourly cacheLife is the staleness
 * ceiling for social previews. Orders the same way as `fetchProjects` so the
 * OG image mirrors the homepage's top-N.
 */
export async function fetchTopProjects(
  options: FetchTopProjectsOptions = {}
): Promise<TopProjectRow[]> {
  "use cache";
  cacheTag(CACHE_TAGS.PROJECTS);
  cacheLife("hours");

  const limit = options.limit ?? 6;
  const supabase = createAnonServerClient();
  const result = await supabase
    .from("projects_with_vote_count")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    throw result.error;
  }

  return withScreenshotUrls(supabase, result.data ?? []);
}
