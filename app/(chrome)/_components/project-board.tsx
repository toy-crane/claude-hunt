"use client";

import type { Cohort } from "@entities/cohort";
import type { ProjectWithVoteCount } from "@entities/vote";
import { CohortChips, useCohortQuery } from "@features/cohort-filter";
import { VoteButton } from "@features/toggle-vote";
import type { ProjectGridRow } from "@widgets/project-grid";
import { ProjectGrid, PromptLine } from "@widgets/project-grid";
import { useCallback, useMemo } from "react";

export interface ProjectBoardProps {
  cohorts: Cohort[];
  isAuthenticated: boolean;
  projects: ProjectGridRow[];
  viewerUserId: string | null;
}

/**
 * Owns the cohort filter, prompt line, and project grid below the page
 * hero. All projects come pre-fetched; switching cohorts filters in memory
 * and the URL `?cohort=` param is the single source of truth via nuqs.
 */
export function ProjectBoard({
  cohorts,
  projects,
  viewerUserId,
  isAuthenticated,
}: ProjectBoardProps) {
  const [cohortId, setCohortId] = useCohortQuery();

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
        onValueChange={setCohortId}
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
