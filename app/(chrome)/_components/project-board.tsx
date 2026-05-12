"use client";

import type { Cohort } from "@entities/cohort";
import type { ProjectWithVoteCount } from "@entities/vote";
import { CohortChips } from "@features/cohort-filter";
import { VoteButton } from "@features/toggle-vote";
import type { ProjectGridRow } from "@widgets/project-grid";
import { ProjectGrid, PromptLine } from "@widgets/project-grid";
import { useCallback, useEffect, useMemo, useState } from "react";

function cohortIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("cohort");
}

export interface ProjectBoardProps {
  cohorts: Cohort[];
  /** Cohort id from the URL on initial server render; null means "All". */
  initialCohortId: string | null;
  isAuthenticated: boolean;
  projects: ProjectGridRow[];
  viewerUserId: string | null;
}

/**
 * Client component that owns the cohort filter state for the landing page.
 * All projects are passed in on first render; cohort switching filters in
 * memory so there are no additional network requests after the initial load.
 * URL is kept in sync via `history.pushState` so browser back/forward can
 * restore the previously selected chip via a `popstate` listener.
 *
 * Owns the board layout below the page hero (prompt line, subtitle,
 * submit button, filter, list) so the count and filter stay in sync.
 */
export function ProjectBoard({
  initialCohortId,
  cohorts,
  projects,
  viewerUserId,
  isAuthenticated,
}: ProjectBoardProps) {
  const [cohortId, setCohortId] = useState(initialCohortId);

  const cohortLabel = useMemo(
    () => cohorts.find((c) => c.id === cohortId)?.label ?? null,
    [cohorts, cohortId]
  );

  const filteredProjects = useMemo(
    () =>
      cohortId ? projects.filter((p) => p.cohort_id === cohortId) : projects,
    [projects, cohortId]
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

  const handleCohortChange = useCallback((nextCohortId: string | null) => {
    setCohortId(nextCohortId);
    const href = nextCohortId ? `/?cohort=${nextCohortId}` : "/";
    window.history.pushState(null, "", href);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCohortId(cohortIdFromLocation());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
        onValueChange={handleCohortChange}
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
