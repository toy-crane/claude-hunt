import type { Cohort } from "@entities/cohort/index.ts";
import { createClient } from "@shared/api/supabase/server.ts";

/**
 * Loads all cohorts for the dropdown. Sorted by name so the UI is stable
 * across page loads regardless of insertion order.
 */
export async function fetchCohorts(): Promise<Cohort[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cohorts")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}
