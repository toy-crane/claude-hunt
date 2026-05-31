import { fetchCohorts } from "@features/cohort-filter/server";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { fetchProjects } from "@widgets/project-grid/server";
import type { SearchParams } from "nuqs/server";

import { ProjectBoard } from "../../_components/project-board";
import { projectsSearchParamsCache } from "../../_search-params";

/**
 * Viewer-overlaid project board behind the page's <Suspense> boundary.
 *
 * Reads the request-time inputs — the `?cohort` seed (searchParams) and the
 * auth session (fetchViewer → cookies) — plus the per-viewer vote overlay, so
 * this section streams while the page shell (heading) prerenders. The cohort
 * list and the grid core are cached reads shared across requests.
 */
export async function ProjectBoardSection({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { cohort } = await projectsSearchParamsCache.parse(searchParams);
  const [viewer, cohorts] = await Promise.all([fetchViewer(), fetchCohorts()]);
  const projects = await fetchProjects({ viewerUserId: viewer?.id ?? null });

  return (
    <ProjectBoard
      cohorts={cohorts}
      initialCohortId={cohort}
      isAuthenticated={Boolean(viewer)}
      projects={projects}
      viewerUserId={viewer?.id ?? null}
    />
  );
}
