import { CohortDropdown, fetchCohorts } from "@features/cohort-filter/index.ts";
import { createClient } from "@shared/api/supabase/server.ts";
import { fetchProjects, ProjectGrid } from "@widgets/project-grid/index.ts";

interface PageProps {
  searchParams: Promise<{ cohort?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { cohort: cohortParam } = await searchParams;
  const selectedCohortId = cohortParam ?? null;

  const [projects, cohorts, supabase] = await Promise.all([
    fetchProjects({ cohortId: selectedCohortId }),
    fetchCohorts(),
    createClient(),
  ]);

  const resolveScreenshotUrl = (path: string) =>
    supabase.storage.from("project-screenshots").getPublicUrl(path).data
      .publicUrl;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading font-medium text-2xl">Micro-Hunt</h1>
          <p className="text-muted-foreground text-sm">
            Projects built by cohort students. Upvote your favourites.
          </p>
        </div>
        <div className="flex items-center justify-end">
          <CohortDropdown
            cohorts={cohorts}
            selectedCohortId={selectedCohortId}
          />
        </div>
      </header>
      <ProjectGrid
        projects={projects}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    </main>
  );
}
