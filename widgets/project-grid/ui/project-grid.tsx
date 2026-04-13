import type { ProjectWithVoteCount } from "@entities/vote/index.ts";
import { EmptyState } from "./empty-state.tsx";
import { ProjectCard } from "./project-card.tsx";

export interface ProjectGridProps {
  projects: ProjectWithVoteCount[];
  /**
   * Maps a `screenshot_path` from the view to a fetchable URL. Injected by
   * the RSC page so this component can stay framework-agnostic and
   * testable without a supabase client.
   */
  resolveScreenshotUrl: (path: string) => string;
}

export function ProjectGrid({
  projects,
  resolveScreenshotUrl,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="project-grid"
    >
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          rank={index + 1}
          screenshotUrl={resolveScreenshotUrl(project.screenshot_path ?? "")}
        />
      ))}
    </div>
  );
}
