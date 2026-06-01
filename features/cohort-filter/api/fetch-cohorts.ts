import type { Cohort } from "@entities/cohort";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Cohort list shared by the dropdown and the chips. Tagged with `cohorts`
 * so an admin tool could bust it on demand via `updateTag`; today cohorts
 * are managed outside the app (seed / migrations), so the
 * `cacheLife("minutes")` window is what surfaces newly inserted cohorts —
 * e.g. on the onboarding screen — within ~1 minute. Anonymous client →
 * cookie-free and reusable across requests under `use cache`.
 */
export async function fetchCohorts(): Promise<Cohort[]> {
  "use cache";
  cacheTag(CACHE_TAGS.COHORTS);
  cacheLife("minutes");

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
