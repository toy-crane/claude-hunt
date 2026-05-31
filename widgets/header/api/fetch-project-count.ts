import { createAnonServerClient } from "@shared/api/supabase/anon-server";
import { cacheTags } from "@shared/config/cache-tags";
import { productionCache } from "@shared/lib/cache";

async function loadProjectCount(): Promise<number> {
  const supabase = createAnonServerClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }
  return count ?? 0;
}

/**
 * Total project count for the header nav badge and the home CTA card.
 * Shares the `projects-grid` cache tag with the landing grid so an
 * insert/delete invalidates both at once.
 */
export const fetchProjectCount = productionCache(
  loadProjectCount,
  ["header-project-count"],
  { revalidate: 60, tags: [cacheTags.projects()] }
);
