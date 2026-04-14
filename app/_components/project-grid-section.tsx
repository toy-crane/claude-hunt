import { DeleteButton } from "@features/delete-project";
import { EditDialog } from "@features/edit-project";
import { VoteButton } from "@features/toggle-vote";
import { createClient } from "@shared/api/supabase/server";
import { fetchProjects, ProjectGrid } from "@widgets/project-grid";

export interface ProjectGridSectionProps {
  cohortId: string | null;
  isAuthenticated: boolean;
  viewerUserId: string | null;
}

/**
 * Async Server Component that fetches and renders the project grid for a
 * given cohort filter.  Placed inside a `<Suspense key={cohortId}>` boundary
 * in the page so that the skeleton fallback shows immediately on every
 * cohort switch.
 */
export async function ProjectGridSection({
  cohortId,
  viewerUserId,
  isAuthenticated,
}: ProjectGridSectionProps) {
  const [supabase, projects] = await Promise.all([
    createClient(),
    fetchProjects({ cohortId, viewerUserId }),
  ]);

  const resolveScreenshotUrl = (path: string) =>
    supabase.storage.from("project-screenshots").getPublicUrl(path).data
      .publicUrl;

  return (
    <ProjectGrid
      projects={projects}
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
          alreadyVoted={
            "viewer_has_voted" in project
              ? Boolean(project.viewer_has_voted)
              : false
          }
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
  );
}
