import type { Cohort } from "@entities/cohort";
import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_PROFILE } from "@shared/config/cache-profile";
import { cacheTags } from "@shared/config/cache-tags";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Cohort list shared by the dropdown and the chips. Tagged so admin tooling
 * can bust on demand via `updateTag`/`revalidateTag`. The `seconds`/`minutes`
 * profile keeps the hot-path cheap while letting newly inserted cohorts
 * surface on the onboarding screen within the revalidate window.
 *
 * Anon client — cohorts are public reference data and the read MUST NOT
 * depend on cookies so `'use cache'` can persist the result across requests.
 */
export async function fetchCohorts(): Promise<Cohort[]> {
  "use cache";
  cacheLife(CACHE_PROFILE);
  cacheTag(cacheTags.cohorts());

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
