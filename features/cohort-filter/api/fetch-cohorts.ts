import type { Cohort } from "@entities/cohort";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { productionCache } from "@shared/lib/cache";

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
 * Cohort list shared by the dropdown and the chips. Tagged so admin
 * tooling can bust on demand via `revalidateTag`. The 1-hour
 * `revalidate` is a generous safety net — cohorts change rarely.
 */
export const fetchCohorts = productionCache(loadCohorts, ["cohorts"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.COHORTS],
});
