import type { ProjectWithVoteCount } from "@entities/vote";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { productionCache } from "@shared/lib/cache";
import { monthBoundsUtc, monthLabel, monthSlug } from "@shared/lib/month";
import { withScreenshotUrls } from "@shared/lib/screenshot-url";

export interface FetchMonthlyTopProjectsOptions {
  limit?: number;
}

/**
 * Narrow row the spotlight cards actually render. Excludes the `images`
 * jsonb and other unused columns so the cached payload stays small (the
 * `fetch-my-projects` slice narrows for the same reason). No viewer-vote
 * overlay — the home spotlight has no vote control.
 */
export type MonthlyTopProject = Pick<
  ProjectWithVoteCount,
  | "id"
  | "title"
  | "tagline"
  | "primary_image_path"
  | "created_at"
  | "vote_count"
  | "cohort_id"
  | "cohort_label"
  | "author_display_name"
> & { screenshotUrl: string };

const SELECT_COLUMNS =
  "id, title, tagline, primary_image_path, created_at, vote_count, cohort_id, cohort_label, author_display_name" as const;

export interface FetchMonthlyTopProjectsResult {
  /** "2026년 5월" — Korean label for the same month. */
  monthLabel: string;
  /** "YYYY-MM" of the month whose projects are returned. */
  monthSlug: string;
  projects: MonthlyTopProject[];
}

async function loadMonthlyCore(
  startUtc: string,
  endUtc: string,
  limit: number
): Promise<MonthlyTopProject[]> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("projects_with_vote_count")
    .select(SELECT_COLUMNS)
    .gte("created_at", startUtc)
    .lt("created_at", endUtc)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return withScreenshotUrls(supabase, data ?? []);
}

function cachedLoad(startUtc: string, endUtc: string, limit: number) {
  return productionCache(
    () => loadMonthlyCore(startUtc, endUtc, limit),
    ["winner-spotlight-monthly", startUtc, String(limit)],
    { revalidate: 60, tags: [CACHE_TAGS.PROJECTS] }
  )();
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
 * The month window is computed in KST (`monthBoundsUtc`) and projected
 * onto the UTC instants stored in `created_at`, so projects bucket by the
 * Korean calendar month and the returned label agrees with the KST date
 * shown on each row.
 *
 * Tries the current month first. If empty (e.g. a cohort gap before the
 * next batch ships), falls back to the month of the most recent project.
 * The returned `monthSlug` / `monthLabel` always reflect the month the
 * projects came from so the page stays honest about the fallback.
 */
export async function fetchMonthlyTopProjects(
  options: FetchMonthlyTopProjectsOptions = {}
): Promise<FetchMonthlyTopProjectsResult> {
  const limit = options.limit ?? 4;
  const now = new Date();
  const current = monthBoundsUtc(now);

  const currentRows = await cachedLoad(current.startUtc, current.endUtc, limit);
  if (currentRows.length > 0) {
    return {
      monthSlug: monthSlug(now),
      monthLabel: monthLabel(now),
      projects: currentRows,
    };
  }

  const latestCreatedAt = await fetchLatestProjectCreatedAt();
  if (!latestCreatedAt) {
    return {
      monthSlug: monthSlug(now),
      monthLabel: monthLabel(now),
      projects: [],
    };
  }

  const fallbackDate = new Date(latestCreatedAt);
  const fallback = monthBoundsUtc(fallbackDate);
  const fallbackRows = await cachedLoad(
    fallback.startUtc,
    fallback.endUtc,
    limit
  );

  return {
    monthSlug: monthSlug(fallbackDate),
    monthLabel: monthLabel(fallbackDate),
    projects: fallbackRows,
  };
}
