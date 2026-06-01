import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Total project count for the header nav badge and the home CTA card.
 * Shares the `projects` cache tag with the landing grid so an
 * insert/delete invalidates both at once. Anonymous client → cookie-free,
 * so it renders into the static shell under `use cache`.
 */
export async function fetchProjectCount(): Promise<number> {
  "use cache";
  cacheTag(CACHE_TAGS.PROJECTS);
  cacheLife("minutes");

  const supabase = createAnonServerClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }
  return count ?? 0;
}
