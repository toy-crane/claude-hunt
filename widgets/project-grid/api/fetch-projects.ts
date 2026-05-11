import type { ProjectWithVoteCount } from "@entities/vote";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { createClient } from "@shared/api/supabase/server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { unstable_cache } from "next/cache";

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

async function loadProjectGridCore(): Promise<ProjectGridCore[]> {
  // Anonymous client — the function MUST NOT depend on cookies/headers so
  // that `unstable_cache` can safely persist the result across requests.
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects_with_vote_count")
    .select("*")
    .order("vote_count", { ascending: false })
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

/**
 * Cached read of the landing-page grid rows. Tagged with
 * `projects-grid` so mutations (vote, submit, edit, delete) can invalidate
 * it via `updateTag`. The 60-second `revalidate` is a safety net — tag
 * invalidation is the primary freshness mechanism.
 *
 * Disabled outside production so dev + e2e see every admin-side write
 * immediately. Tests that seed via the admin client never go through a
 * server action, so they can't trigger `updateTag`; without this guard
 * the cached grid would mask freshly inserted rows during the
 * configured TTL.
 */
const fetchProjectGridCore =
  process.env.NODE_ENV === "production"
    ? unstable_cache(loadProjectGridCore, ["project-grid-core"], {
        revalidate: 60,
        tags: [CACHE_TAGS.PROJECTS_GRID],
      })
    : loadProjectGridCore;

/**
 * Returns the set of project ids the viewer has voted on. Caller is
 * expected to short-circuit to an empty set when no viewer is signed in.
 * Not cached across requests — votes change per user.
 */
async function fetchViewerVotedIds(viewerUserId: string): Promise<Set<string>> {
  const supabase = await createClient();
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
 * Cookie-free variant for contexts that cannot call `cookies()` — currently
 * `app/opengraph-image.tsx`, where the route is regenerated on an ISR schedule
 * and must not depend on a per-request auth session. Orders the same way as
 * `fetchProjects` so the OG image mirrors the homepage's top-N exactly.
 */
export async function fetchTopProjects(
  options: FetchTopProjectsOptions = {}
): Promise<TopProjectRow[]> {
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

  const rows = result.data ?? [];
  const screenshots = supabase.storage.from(SCREENSHOT_BUCKET);
  return rows.map((row) => ({
    ...row,
    screenshotUrl: row.primary_image_path
      ? screenshots.getPublicUrl(row.primary_image_path).data.publicUrl
      : "",
  }));
}
