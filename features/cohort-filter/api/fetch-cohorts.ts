import type { Cohort } from "@entities/cohort";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { unstable_cache } from "next/cache";

async function loadCohorts(): Promise<Cohort[]> {
  // Anon client — cohorts are public reference data and the read MUST NOT
  // depend on cookies so `unstable_cache` can persist the result across
  // requests.
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("cohorts")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}

/**
 * Reads the cohort list shared by the dropdown and the chips. Cohorts
 * change very rarely (only when an admin adds a new one), so we cache for
 * an hour. The `cohorts` tag lets future admin tooling invalidate on
 * demand via `revalidateTag`.
 *
 * Disabled outside production so dev + e2e see admin-side cohort
 * writes immediately. See fetch-projects.ts for the rationale.
 */
export const fetchCohorts =
  process.env.NODE_ENV === "production"
    ? unstable_cache(loadCohorts, ["cohorts"], {
        revalidate: 3600,
        tags: [CACHE_TAGS.COHORTS],
      })
    : loadCohorts;
