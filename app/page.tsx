import { CohortDropdown, fetchCohorts } from "@features/cohort-filter/index.ts";
import { DeleteButton } from "@features/delete-project/index.ts";
import { EditDialog } from "@features/edit-project/index.ts";
import { SubmitDialog } from "@features/submit-project/index.ts";
import { VoteButton } from "@features/toggle-vote/index.ts";
import { createClient } from "@shared/api/supabase/server.ts";
import { fetchProjects, ProjectGrid } from "@widgets/project-grid/index.ts";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{ cohort?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { cohort: cohortParam } = await searchParams;
  const selectedCohortId = cohortParam ?? null;

  const supabase = await createClient();

  // Stage 1: auth + cohorts in parallel (cohorts do not depend on the
  // viewer; getUser returns quickly from the session cookie).
  const [
    {
      data: { user },
    },
    cohorts,
  ] = await Promise.all([supabase.auth.getUser(), fetchCohorts()]);

  // Stage 2: projects (+ viewer's votes merged inside) and profile's
  // cohort_id lookup in parallel. Both depend on `user`, neither on
  // each other.
  const [projects, profileResult] = await Promise.all([
    fetchProjects({
      cohortId: selectedCohortId,
      viewerUserId: user?.id ?? null,
    }),
    user
      ? supabase.from("profiles").select("cohort_id").eq("id", user.id).single()
      : Promise.resolve({
          data: null as { cohort_id: string | null } | null,
          error: null,
        }),
  ]);
  const viewerCohortId = profileResult.data?.cohort_id ?? null;

  const resolveScreenshotUrl = (path: string) =>
    supabase.storage.from("project-screenshots").getPublicUrl(path).data
      .publicUrl;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading font-medium text-2xl">Project Board</h1>
          <p className="text-muted-foreground text-sm">
            Projects built by cohort students. Upvote your favourites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-muted-foreground text-xs">
            Filter by cohort
          </span>
          <Suspense fallback={null}>
            <CohortDropdown
              cohorts={cohorts}
              selectedCohortId={selectedCohortId}
            />
          </Suspense>
          <SubmitDialog
            cohortId={viewerCohortId}
            isAuthenticated={Boolean(user)}
          />
        </div>
      </header>

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
            isAuthenticated={Boolean(user)}
            ownedByViewer={user?.id != null && project.user_id === user.id}
            projectId={project.id ?? ""}
            voteCount={project.vote_count ?? 0}
          />
        )}
        resolveScreenshotUrl={resolveScreenshotUrl}
        viewerUserId={user?.id ?? null}
      />
    </main>
  );
}
