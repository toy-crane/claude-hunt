import type { ProjectWithVoteCount } from "@entities/vote";
import { ViewTransition } from "react";
import { EmptyState } from "./empty-state";
import { ProjectCard } from "./project-card";
import { RankSlot } from "./rank-badge";

export interface ProjectGridProps {
  /**
   * Maps a cohort id to its human-readable label. Used by the mobile
   * meta line inside `ProjectCard`. Optional — when omitted, rows render
   * the rank number alone on mobile.
   */
  cohortLabelsById?: Record<string, string>;
  projects: ProjectWithVoteCount[];
  /** Owner-only actions slot forwarded to each row. */
  renderOwnerActions?: (project: ProjectWithVoteCount) => React.ReactNode;
  /** Vote button slot forwarded to each row. */
  renderVoteButton?: (project: ProjectWithVoteCount) => React.ReactNode;
  /**
   * Maps a `screenshot_path` from the view to a fetchable URL. Injected by
   * the RSC page so this component can stay framework-agnostic and
   * testable without a supabase client.
   */
  resolveScreenshotUrl: (path: string) => string;
  /** Current viewer's `auth.uid()` (null for anonymous). */
  viewerUserId?: string | null;
}

export function ProjectGrid({
  cohortLabelsById,
  projects,
  resolveScreenshotUrl,
  viewerUserId,
  renderOwnerActions,
  renderVoteButton,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <section
      aria-label="프로젝트 목록"
      className="border border-border min-[720px]:grid min-[720px]:grid-cols-[52px_72px_minmax(0,1fr)_130px_auto] min-[720px]:gap-x-4"
      data-testid="project-grid"
    >
      <div
        aria-hidden="true"
        className="col-span-full hidden grid-cols-subgrid bg-muted px-5 py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em] min-[720px]:grid"
        data-testid="project-grid-header"
      >
        <div className="flex items-center gap-1.5">
          <RankSlot />
          <span>RANK</span>
        </div>
        <div>PREVIEW</div>
        <div>NAME</div>
        <div>AUTHOR</div>
        <div>VOTES</div>
      </div>
      <ul className="flex flex-col min-[720px]:col-span-full min-[720px]:grid min-[720px]:grid-cols-subgrid [&>li:not(:first-of-type)]:border-border [&>li:not(:first-of-type)]:border-t">
        {projects.map((project, index) => {
          const rank = index + 1;
          const cohortLabel = project.cohort_id
            ? (cohortLabelsById?.[project.cohort_id] ?? null)
            : null;
          return (
            <ViewTransition key={project.id}>
              <ProjectCard
                cohortLabel={cohortLabel}
                priority={rank <= 3}
                project={project}
                rank={rank}
                renderOwnerActions={renderOwnerActions}
                renderVoteButton={renderVoteButton}
                screenshotUrl={resolveScreenshotUrl(
                  project.screenshot_path ?? ""
                )}
                viewerUserId={viewerUserId}
              />
            </ViewTransition>
          );
        })}
      </ul>
    </section>
  );
}
