import { CohortDropdown, fetchCohorts } from "@features/cohort-filter/index.ts";
import { DeleteButton } from "@features/delete-project/index.ts";
import { EditDialog } from "@features/edit-project/index.ts";
import { SubmitDialog } from "@features/submit-project/index.ts";
import { VoteButton } from "@features/toggle-vote/index.ts";
import { createClient } from "@shared/api/supabase/server.ts";
import { fetchViewer } from "@shared/api/supabase/viewer.ts";
import { Separator } from "@shared/ui/separator.tsx";
import { Header } from "@widgets/header/index.ts";
import { fetchProjects, ProjectGrid } from "@widgets/project-grid/index.ts";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{ cohort?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { cohort: cohortParam } = await searchParams;
  const selectedCohortId = cohortParam ?? null;

  const supabase = await createClient();

  const [viewer, cohorts] = await Promise.all([fetchViewer(), fetchCohorts()]);

  const projects = await fetchProjects({
    cohortId: selectedCohortId,
    viewerUserId: viewer?.id ?? null,
  });

  const resolveScreenshotUrl = (path: string) =>
    supabase.storage.from("project-screenshots").getPublicUrl(path).data
      .publicUrl;

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 p-6">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading font-medium text-2xl">
                Project Board
              </h1>
              <p className="text-muted-foreground text-sm">
                Projects built by cohort students. Upvote your favourites.
              </p>
            </div>
            <div className="w-fit self-start">
              <SubmitDialog
                cohortId={viewer?.cohortId ?? null}
                isAuthenticated={Boolean(viewer)}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-2">
            <span aria-hidden="true" className="text-muted-foreground text-xs">
              Filter by cohort
            </span>
            <Suspense fallback={null}>
              <CohortDropdown
                cohorts={cohorts}
                selectedCohortId={selectedCohortId}
              />
            </Suspense>
          </div>
        </section>

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
              isAuthenticated={Boolean(viewer)}
              ownedByViewer={
                viewer?.id != null && project.user_id === viewer.id
              }
              projectId={project.id ?? ""}
              voteCount={project.vote_count ?? 0}
            />
          )}
          resolveScreenshotUrl={resolveScreenshotUrl}
          viewerUserId={viewer?.id ?? null}
        />
      </main>
    </>
  );
}
