import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { createClient } from "@shared/api/supabase/server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { productionCache } from "@shared/lib/cache";
import type {
  ProjectGridCore,
  ProjectGridRow,
} from "@widgets/project-grid/server";
import { monthLabelFromDate, monthSlugFromDate } from "../lib/format";

export interface FetchMonthlyTopProjectsOptions {
  limit?: number;
  viewerUserId?: string | null;
}

export interface FetchMonthlyTopProjectsResult {
  /** "2026년 5월" — Korean label for the same month. */
  monthLabel: string;
  /** "YYYY-MM" of the month whose projects are returned. */
  monthSlug: string;
  projects: ProjectGridRow[];
}

/**
 * UTC start-of-month for a given date, in ISO 8601. Doubles as a cache-key
 * segment so a cached result from one month cannot bleed into another.
 */
function monthStartIso(date: Date): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0)
  ).toISOString();
}

/** UTC start of the month immediately following the given month start. */
function nextMonthStartIso(monthStart: string): string {
  const d = new Date(monthStart);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0)
  ).toISOString();
}

async function loadMonthlyCore(
  monthStart: string,
  monthEnd: string,
  limit: number
): Promise<ProjectGridCore[]> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects_with_vote_count")
    .select("*")
    .gte("created_at", monthStart)
    .lt("created_at", monthEnd)
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

function cachedLoad(monthStart: string, monthEnd: string, limit: number) {
  return productionCache(
    () => loadMonthlyCore(monthStart, monthEnd, limit),
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
 * `created_at` of the single most recent project. Used to pick the
 * fallback month when the current month is empty. Returns `null` only
 * when the table has no projects at all.
 */
async function fetchLatestProjectCreatedAt(): Promise<string | null> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects_with_vote_count")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data?.created_at ?? null;
}

/**
 * Top `limit` projects for the most recent month that has at least one
 * project, sorted by votes desc → created desc.
 *
 * Tries the current UTC month first. If that month is empty (e.g. a
 * cohort gap before the next batch ships), falls back to the month of
 * the most recent project in the table. The returned `monthSlug` /
 * `monthLabel` always reflect the month the projects came from — the
 * caller should render those instead of `Date.now()` so the page stays
 * honest about the fallback.
 */
export async function fetchMonthlyTopProjects(
  options: FetchMonthlyTopProjectsOptions = {}
): Promise<FetchMonthlyTopProjectsResult> {
  const limit = options.limit ?? 4;
  const now = new Date();
  const currentStart = monthStartIso(now);
  const currentEnd = nextMonthStartIso(currentStart);

  const [currentRows, votedIds] = await Promise.all([
    cachedLoad(currentStart, currentEnd, limit),
    options.viewerUserId
      ? fetchViewerVotedIds(options.viewerUserId)
      : Promise.resolve(new Set<string>()),
  ]);

  if (currentRows.length > 0) {
    return {
      monthSlug: monthSlugFromDate(now),
      monthLabel: monthLabelFromDate(now),
      projects: currentRows.map((row) => ({
        ...row,
        viewer_has_voted: row.id != null && votedIds.has(row.id),
      })),
    };
  }

  const latestCreatedAt = await fetchLatestProjectCreatedAt();
  if (!latestCreatedAt) {
    return {
      monthSlug: monthSlugFromDate(now),
      monthLabel: monthLabelFromDate(now),
      projects: [],
    };
  }

  const fallbackDate = new Date(latestCreatedAt);
  const fallbackStart = monthStartIso(fallbackDate);
  const fallbackEnd = nextMonthStartIso(fallbackStart);
  const fallbackRows = await cachedLoad(fallbackStart, fallbackEnd, limit);

  return {
    monthSlug: monthSlugFromDate(fallbackDate),
    monthLabel: monthLabelFromDate(fallbackDate),
    projects: fallbackRows.map((row) => ({
      ...row,
      viewer_has_voted: row.id != null && votedIds.has(row.id),
    })),
  };
}
