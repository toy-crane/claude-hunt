import { CohortDropdown, fetchCohorts } from "@features/cohort-filter/index.ts";
import { EditDialog } from "@features/edit-project/index.ts";
import { SubmitForm } from "@features/submit-project/index.ts";
import { createClient } from "@shared/api/supabase/server.ts";
import { fetchProjects, ProjectGrid } from "@widgets/project-grid/index.ts";

interface PageProps {
  searchParams: Promise<{ cohort?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { cohort: cohortParam } = await searchParams;
  const selectedCohortId = cohortParam ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerCohortId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("cohort_id")
      .eq("id", user.id)
      .single();
    viewerCohortId = profile?.cohort_id ?? null;
  }

  const [projects, cohorts] = await Promise.all([
    fetchProjects({ cohortId: selectedCohortId }),
    fetchCohorts(),
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

      {user ? (
        <section
          aria-labelledby="submit-heading"
          className="flex flex-col gap-4 rounded-md border p-6"
        >
          <h2 className="font-heading font-medium text-lg" id="submit-heading">
            Submit a project
          </h2>
          <SubmitForm cohortId={viewerCohortId} />
        </section>
      ) : null}

      <ProjectGrid
        projects={projects}
        renderOwnerActions={(project) => (
          <EditDialog
            project={{
              id: project.id ?? "",
              title: project.title ?? "",
              tagline: project.tagline ?? "",
              project_url: project.project_url ?? "",
            }}
          />
        )}
        resolveScreenshotUrl={resolveScreenshotUrl}
        viewerUserId={user?.id ?? null}
      />
    </main>
  );
}
