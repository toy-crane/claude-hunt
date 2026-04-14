import type { Cohort } from "@entities/cohort";
import { createClient } from "@shared/api/supabase/server";
import { cache } from "react";

/**
 * Loads all cohorts for the dropdown. Sorted by name so the UI is stable
 * across page loads regardless of insertion order.
 *
 * Wrapped in `cache()` so multiple call sites within the same server
 * render tree share one Supabase query (e.g. page + ProjectGridSection).
 */
export const fetchCohorts = cache(async (): Promise<Cohort[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cohorts")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
});
