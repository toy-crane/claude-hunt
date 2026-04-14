import { CohortDropdown, fetchCohorts } from "@features/cohort-filter";
import { SubmitDialog } from "@features/submit-project";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Separator } from "@shared/ui/separator";
import { Header } from "@widgets/header";
import { ProjectGridSkeleton } from "@widgets/project-grid";
import { Suspense } from "react";
import { ProjectGridSection } from "./_components/project-grid-section";

interface PageProps {
  searchParams: Promise<{ cohort?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { cohort: cohortParam } = await searchParams;
  const selectedCohortId = cohortParam ?? null;

  const [viewer, cohorts] = await Promise.all([fetchViewer(), fetchCohorts()]);

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

        <Suspense
          fallback={<ProjectGridSkeleton />}
          key={selectedCohortId ?? "all"}
        >
          <ProjectGridSection
            cohortId={selectedCohortId}
            isAuthenticated={Boolean(viewer)}
            viewerUserId={viewer?.id ?? null}
          />
        </Suspense>
      </main>
    </>
  );
}
