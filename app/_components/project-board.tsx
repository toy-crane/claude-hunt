"use client";

import type { Cohort } from "@entities/cohort";
import { CohortDropdown } from "@features/cohort-filter";
import { DeleteButton } from "@features/delete-project";
import { EditDialog } from "@features/edit-project";
import { VoteButton } from "@features/toggle-vote";
import type { ProjectGridRow } from "@widgets/project-grid";
import { ProjectGrid } from "@widgets/project-grid";
import { useCallback, useMemo, useState } from "react";

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
 * URL is kept in sync via `history.replaceState` (no RSC re-render).
 */
export function ProjectBoard({
  initialCohortId,
  cohorts,
  projects,
  viewerUserId,
  isAuthenticated,
}: ProjectBoardProps) {
  const [cohortId, setCohortId] = useState(initialCohortId);

  const filteredProjects = useMemo(
    () =>
      cohortId ? projects.filter((p) => p.cohort_id === cohortId) : projects,
    [projects, cohortId]
  );

  const screenshotUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      if (p.screenshot_path) {
        map.set(p.screenshot_path, p.screenshotUrl);
      }
    }
    return map;
  }, [projects]);

  const resolveScreenshotUrl = useCallback(
    (path: string) => screenshotUrlMap.get(path) ?? "",
    [screenshotUrlMap]
  );

  const handleCohortChange = (nextCohortId: string | null) => {
    setCohortId(nextCohortId);
    const href = nextCohortId ? `/?cohort=${nextCohortId}` : "/";
    window.history.replaceState(null, "", href);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <span aria-hidden="true" className="text-muted-foreground text-xs">
          클래스로 필터
        </span>
        <CohortDropdown
          cohorts={cohorts}
          onValueChange={handleCohortChange}
          value={cohortId}
        />
      </div>
      <ProjectGrid
        projects={filteredProjects}
        renderOwnerActions={(project) => (
          <>
            <EditDialog
              project={{
                id: project.id ?? "",
                title: project.title ?? "",
                tagline: project.tagline ?? "",
                project_url: project.project_url ?? "",
              }}
            />
            <DeleteButton
              projectId={project.id ?? ""}
              projectTitle={project.title ?? ""}
            />
          </>
        )}
        renderVoteButton={(project) => (
          <VoteButton
            alreadyVoted={Boolean(
              "viewer_has_voted" in project && project.viewer_has_voted
            )}
            isAuthenticated={isAuthenticated}
            ownedByViewer={
              viewerUserId != null && project.user_id === viewerUserId
            }
            projectId={project.id ?? ""}
            voteCount={project.vote_count ?? 0}
          />
        )}
        resolveScreenshotUrl={resolveScreenshotUrl}
        viewerUserId={viewerUserId}
      />
    </>
  );
}
