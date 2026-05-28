import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { createClient } from "@shared/api/supabase/server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { productionCache } from "@shared/lib/cache";
import {
  fetchProjects,
  type ProjectGridCore,
  type ProjectGridRow,
} from "@widgets/project-grid/server";

export interface FetchMonthlyTopProjectsOptions {
  limit?: number;
  viewerUserId?: string | null;
}

/**
 * UTC start-of-month in ISO 8601. Used as both a query parameter and a
 * cache-key segment so a cached result from a previous month cannot bleed
 * into the next month's hero.
 */
function currentMonthStartIso(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  ).toISOString();
}

async function loadMonthlyCore(
  monthStart: string,
  limit: number
): Promise<ProjectGridCore[]> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects_with_vote_count")
    .select("*")
    .gte("created_at", monthStart)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

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

function cachedLoad(monthStart: string, limit: number) {
  return productionCache(
    () => loadMonthlyCore(monthStart, limit),
    ["winner-spotlight-monthly", monthStart, String(limit)],
    { revalidate: 60, tags: [CACHE_TAGS.PROJECTS_GRID] }
  )();
}

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
 * Top `limit` projects created in the current UTC month, sorted by votes
 * desc → created desc. When the month is empty (new month before any
 * project ships), falls back to the all-time top via `fetchProjects` so
 * the home hero never renders blank.
 */
export async function fetchMonthlyTopProjects(
  options: FetchMonthlyTopProjectsOptions = {}
): Promise<ProjectGridRow[]> {
  const limit = options.limit ?? 4;
  const monthStart = currentMonthStartIso();

  const [rows, votedIds] = await Promise.all([
    cachedLoad(monthStart, limit),
    options.viewerUserId
      ? fetchViewerVotedIds(options.viewerUserId)
      : Promise.resolve(new Set<string>()),
  ]);

  if (rows.length === 0) {
    const all = await fetchProjects({ viewerUserId: options.viewerUserId });
    return all.slice(0, limit);
  }

  return rows.map((row) => ({
    ...row,
    viewer_has_voted: row.id != null && votedIds.has(row.id),
  }));
}
