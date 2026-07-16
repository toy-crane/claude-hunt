"use client";

import type { Cohort } from "@entities/cohort";
import type { ProjectWithVoteCount } from "@entities/vote";
import { CohortChips, useCohortQuery } from "@features/cohort-filter";
import { VoteButton } from "@features/toggle-vote";
import type { ProjectGridRow } from "@widgets/project-grid";
import { ProjectGrid, PromptLine } from "@widgets/project-grid";
import { useCallback, useMemo, useRef, useState } from "react";

export interface ProjectBoardProps {
  cohorts: Cohort[];
  /**
   * Cohort parsed from `?cohort` server-side. Seeds the very first render
   * (SSR + pre-hydration) so a deep-linked URL shows the filtered grid
   * immediately, before nuqs reads `window.location`.
   */
  initialCohortId?: string | null;
  isAuthenticated: boolean;
  projects: ProjectGridRow[];
  viewerUserId: string | null;
}

/**
 * Owns the cohort filter, prompt line, and project grid below the page
 * hero. All projects come pre-fetched; switching cohorts filters in memory
 * and the URL `?cohort=` param is the source of truth via nuqs.
 *
 * Row order is a load-time snapshot: voting updates counts in place and the
 * new ranking applies on the next page load, so the list never reshuffles
 * under the reader mid-session.
 */
export function ProjectBoard({
  cohorts,
  initialCohortId = null,
  projects,
  viewerUserId,
  isAuthenticated,
}: ProjectBoardProps) {
  const [urlCohortId, setCohortId] = useCohortQuery();
  // Until the user interacts, prefer the URL value but fall back to the
  // server-seeded `initialCohortId` so SSR / first paint isn't unfiltered.
  // Once touched we follow nuqs verbatim so clearing to "all" (null) works
  // instead of snapping back to the seed.
  const [touched, setTouched] = useState(false);
  const cohortId = touched ? urlCohortId : (urlCohortId ?? initialCohortId);

  const onCohortChange = useCallback(
    (next: string | null) => {
      setTouched(true);
      setCohortId(next);
    },
    [setCohortId]
  );

  const cohortLabel = useMemo(
    () => cohorts.find((c) => c.id === cohortId)?.label ?? null,
    [cohorts, cohortId]
  );

  // Server revalidations (e.g. after a vote) re-deliver `projects` sorted by
  // the fresh vote counts. Pin every row back to the position it held on
  // first render; rows unknown to the snapshot (submitted mid-session) sort
  // after the pinned ones, keeping their incoming relative order.
  const initialOrder = useRef<Map<string, number> | null>(null);
  if (initialOrder.current === null) {
    initialOrder.current = new Map(projects.map((p, i) => [p.id ?? "", i]));
  }
  const stableProjects = useMemo(() => {
    const order = initialOrder.current;
    if (!order) {
      return projects;
    }
    return [...projects].sort(
      (a, b) =>
        (order.get(a.id ?? "") ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.id ?? "") ?? Number.MAX_SAFE_INTEGER)
    );
  }, [projects]);

  const filteredProjects = useMemo(
    () =>
      cohortId
        ? stableProjects.filter((p) => p.cohort_id === cohortId)
        : stableProjects,
    [stableProjects, cohortId]
  );

  const cohortCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      if (p.cohort_id) {
        counts[p.cohort_id] = (counts[p.cohort_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [projects]);

  const cohortLabelsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of cohorts) {
      map[c.id] = c.label;
    }
    return map;
  }, [cohorts]);

  const renderVoteButton = useCallback(
    (project: ProjectWithVoteCount) => (
      <VoteButton
        alreadyVoted={Boolean(
          "viewer_has_voted" in project && project.viewer_has_voted
        )}
        isAuthenticated={isAuthenticated}
        ownedByViewer={viewerUserId != null && project.user_id === viewerUserId}
        projectId={project.id ?? ""}
        variant="inline"
        voteCount={project.vote_count ?? 0}
      />
    ),
    [isAuthenticated, viewerUserId]
  );

  return (
    <>
      <PromptLine cohortLabel={cohortLabel} />
      <CohortChips
        allCount={projects.length}
        cohorts={cohorts}
        counts={cohortCounts}
        onValueChange={onCohortChange}
        value={cohortId}
      />
      <ProjectGrid
        cohortLabelsById={cohortLabelsById}
        projects={filteredProjects}
        renderVoteButton={renderVoteButton}
        viewerUserId={viewerUserId}
      />
    </>
  );
}
