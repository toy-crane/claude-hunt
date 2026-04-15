import { fetchCohorts } from "@features/cohort-filter/server";
import { SubmitDialog } from "@features/submit-project";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Separator } from "@shared/ui/separator";
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
      <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 p-6">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading font-medium text-2xl">
                프로젝트 보드
              </h1>
              <p className="text-muted-foreground text-sm">
                마음에 드는 프로젝트에 응원을 보내주세요.
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
        </section>

        <ProjectBoard
          cohorts={cohorts}
          initialCohortId={selectedCohortId}
          isAuthenticated={Boolean(viewer)}
          projects={projects}
          viewerUserId={viewer?.id ?? null}
        />
      </main>
      <Footer />
    </>
  );
}
