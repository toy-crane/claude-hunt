import { fetchCohorts } from "@features/cohort-filter/server";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Footer } from "@widgets/footer";
import { Header } from "@widgets/header";
import { fetchProjects } from "@widgets/project-grid/server";
import { ProjectBoard } from "./_components/project-board";

interface PageProps {
  searchParams: Promise<{ cohort?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { cohort: cohortParam } = await searchParams;
  const selectedCohortId = cohortParam ?? null;

  const [viewer, cohorts] = await Promise.all([fetchViewer(), fetchCohorts()]);
  const projects = await fetchProjects({
    viewerUserId: viewer?.id ?? null,
  });

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 bg-background p-6 text-foreground">
        <ProjectBoard
          cohorts={cohorts}
          initialCohortId={selectedCohortId}
          isAuthenticated={Boolean(viewer)}
          projects={projects}
          viewerCohortId={viewer?.cohortId ?? null}
          viewerUserId={viewer?.id ?? null}
        />
      </main>
      <Footer />
    </>
  );
}
