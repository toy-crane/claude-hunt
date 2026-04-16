import type { ProjectWithVoteCount } from "@entities/vote";
import { ViewTransition } from "react";
import { EmptyState } from "./empty-state";
import { ProjectCard } from "./project-card";

export interface ProjectGridProps {
  projects: ProjectWithVoteCount[];
  /** Owner-only actions slot forwarded to each card. */
  renderOwnerActions?: (project: ProjectWithVoteCount) => React.ReactNode;
  /** Vote button slot forwarded to each card. */
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
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="project-grid"
    >
      {projects.map((project, index) => {
        const rank = index + 1;
        return (
          <ViewTransition key={project.id}>
            <ProjectCard
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
    </div>
  );
}
