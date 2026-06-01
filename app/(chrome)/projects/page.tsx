import { NuqsProvider } from "@core/providers/nuqs-provider";
import { fetchCohorts } from "@features/cohort-filter/server";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Skeleton } from "@shared/ui/skeleton";
import { fetchProjects } from "@widgets/project-grid/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ProjectBoard } from "../_components/project-board";
import { projectsSearchParamsCache } from "../_search-params";

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
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "claude-hunt — Claude Code 수강생들의 프로젝트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PROJECTS_TITLE,
    description: PROJECTS_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default function Page({ searchParams }: PageProps) {
  // The heading is the static shell; the board (viewer votes + cohort list +
  // the project grid) reads the auth cookie and `searchParams`, so it streams
  // in behind a Suspense boundary once Cache Components is enabled.
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 bg-background p-6 text-foreground">
      <h1 className="font-heading font-medium text-3xl">프로젝트 보드</h1>
      <Suspense fallback={<ProjectBoardSkeleton />}>
        <BoardData searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

export async function BoardData({ searchParams }: PageProps) {
  // Parse `?cohort` server-side and seed the board so a deep-linked
  // /projects?cohort=X renders the filtered grid in the SSR HTML (and the
  // first client paint) instead of flashing the full list until nuqs reads
  // the URL after hydration.
  const { cohort } = await projectsSearchParamsCache.parse(searchParams);

  const [viewer, cohorts] = await Promise.all([fetchViewer(), fetchCohorts()]);
  const projects = await fetchProjects({
    viewerUserId: viewer?.id ?? null,
  });

  // nuqs adapter lives here (not the root layout) so its `useSearchParams`
  // read stays inside this page's Suspense boundary instead of forcing the
  // whole app dynamic under Cache Components.
  return (
    <NuqsProvider>
      <ProjectBoard
        cohorts={cohorts}
        initialCohortId={cohort}
        isAuthenticated={Boolean(viewer)}
        projects={projects}
        viewerUserId={viewer?.id ?? null}
      />
    </NuqsProvider>
  );
}

const SKELETON_CHIP_KEYS = ["chip-1", "chip-2", "chip-3", "chip-4"];

function ProjectBoardSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="project-board-skeleton">
      <div className="flex flex-wrap gap-2">
        {SKELETON_CHIP_KEYS.map((key) => (
          <Skeleton className="h-8 w-20" key={key} />
        ))}
      </div>
      <Skeleton className="h-[28rem] w-full" />
    </div>
  );
}
