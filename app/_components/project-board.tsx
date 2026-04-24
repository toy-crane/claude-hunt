"use client";

import type { Cohort } from "@entities/cohort";
import { CohortChips } from "@features/cohort-filter";
import { DeleteButton } from "@features/delete-project";
import { EditDialog } from "@features/edit-project";
import { SubmitDialog } from "@features/submit-project";
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
  /** Signed-in viewer's cohort id (for the submit form's default). */
  viewerCohortId?: string | null;
  viewerUserId: string | null;
}

/**
 * Client component that owns the cohort filter state for the landing page.
 * All projects are passed in on first render; cohort switching filters in
 * memory so there are no additional network requests after the initial load.
 * URL is kept in sync via `history.pushState` so browser back/forward can
 * restore the previously selected chip via a `popstate` listener.
 *
 * Owns the full landing layout (prompt line, H1, subtitle, submit button,
 * filter, list) so all three pieces stay synchronized with the filter state.
 */
export function ProjectBoard({
  initialCohortId,
  cohorts,
  projects,
  viewerUserId,
  viewerCohortId = null,
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

  return (
    <>
      <PromptLine cohortLabel={cohortLabel} />
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading font-medium text-2xl">프로젝트 보드</h1>
          <p
            className="text-muted-foreground text-sm"
            data-testid="project-board-subtitle"
          >
            {filteredProjects.length}개 프로젝트 · 마음에 드는 곳에 응원을
            보내주세요.
          </p>
        </div>
        <div className="w-fit self-end">
          <SubmitDialog
            cohortId={viewerCohortId}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </section>
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
        renderOwnerActions={(project) => (
          <>
            <EditDialog
              project={{
                id: project.id ?? "",
                title: project.title ?? "",
                tagline: project.tagline ?? "",
                project_url: project.project_url ?? "",
              }}
              variant="icon"
            />
            <DeleteButton
              projectId={project.id ?? ""}
              projectTitle={project.title ?? ""}
              variant="icon"
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
            variant="inline"
            voteCount={project.vote_count ?? 0}
          />
        )}
        resolveScreenshotUrl={resolveScreenshotUrl}
        viewerUserId={viewerUserId}
      />
    </>
  );
}
