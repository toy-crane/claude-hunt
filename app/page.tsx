import { createClient } from "@shared/api/supabase/server.ts";
import { fetchProjects, ProjectGrid } from "@widgets/project-grid/index.ts";

export default async function Page() {
  const projects = await fetchProjects();
  const supabase = await createClient();
  const resolveScreenshotUrl = (path: string) =>
    supabase.storage.from("project-screenshots").getPublicUrl(path).data
      .publicUrl;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading font-medium text-2xl">Micro-Hunt</h1>
        <p className="text-muted-foreground text-sm">
          Projects built by cohort students. Upvote your favourites.
        </p>
      </header>
      <ProjectGrid
        projects={projects}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    </main>
  );
}
