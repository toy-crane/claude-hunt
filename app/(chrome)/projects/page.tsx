import { fetchCohorts } from "@features/cohort-filter/server";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { fetchProjects } from "@widgets/project-grid/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { ProjectBoard } from "../_components/project-board";
import { homeSearchParamsCache } from "../_search-params";

const PROJECTS_TITLE = "프로젝트 보드 — 클로드 헌트";
const PROJECTS_DESCRIPTION =
  "Claude Code 수강생들이 만든 프로젝트를 둘러보고 응원해 주세요.";

export const metadata: Metadata = {
  title: { absolute: PROJECTS_TITLE },
  description: PROJECTS_DESCRIPTION,
  alternates: { canonical: "/projects" },
  openGraph: {
    title: PROJECTS_TITLE,
    description: PROJECTS_DESCRIPTION,
    url: "/projects",
    type: "website",
  },
  twitter: {
    title: PROJECTS_TITLE,
    description: PROJECTS_DESCRIPTION,
  },
};

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page({ searchParams }: PageProps) {
  await homeSearchParamsCache.parse(searchParams);

  const [viewer, cohorts] = await Promise.all([fetchViewer(), fetchCohorts()]);
  const projects = await fetchProjects({
    viewerUserId: viewer?.id ?? null,
  });

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 bg-background p-6 text-foreground">
      <h1 className="font-heading font-medium text-3xl">프로젝트 보드</h1>
      <ProjectBoard
        cohorts={cohorts}
        isAuthenticated={Boolean(viewer)}
        projects={projects}
        viewerUserId={viewer?.id ?? null}
      />
    </main>
  );
}
