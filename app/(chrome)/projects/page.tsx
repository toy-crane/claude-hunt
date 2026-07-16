import { NuqsProvider } from "@core/providers/nuqs-provider";
import { fetchCohorts } from "@features/cohort-filter/server";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Skeleton } from "@shared/ui/skeleton";
import { ProjectGridSkeleton } from "@widgets/project-grid";
import { fetchProjects } from "@widgets/project-grid/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ProjectBoard } from "../_components/project-board";
import { projectsSearchParamsCache } from "../_search-params";

const PROJECTS_TITLE = "프로젝트 보드 — 클로드 헌트";
const PROJECTS_DESCRIPTION =
  "Claude Code 수강생들이 만든 프로젝트를 둘러보고 응원해 보세요.";

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
  //
  // The board header is deliberately tight — heading, prompt line, filter and
  // list read as one block — so spacing is per-element rather than a uniform
  // `gap`, and ProjectBoardSkeleton below mirrors it.
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col bg-background p-6 text-foreground">
      <h1 className="mb-1.5 font-heading font-medium text-2xl">
        프로젝트 보드
      </h1>
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

const SKELETON_CHIPS = [
  { className: "h-6 w-24 flex-none", key: "chip-1" },
  { className: "h-6 w-16 flex-none", key: "chip-2" },
  { className: "h-6 w-20 flex-none", key: "chip-3" },
  { className: "h-6 w-28 flex-none", key: "chip-4" },
  { className: "h-6 w-16 flex-none", key: "chip-5" },
  { className: "h-6 w-20 flex-none", key: "chip-6" },
];

function ProjectBoardSkeleton() {
  return (
    <div className="flex flex-col" data-testid="project-board-skeleton">
      {/* PromptLine */}
      <Skeleton className="mb-3.5 h-4 w-64 max-w-full" />
      {/* Desktop toolbar — count label + combobox trigger */}
      <div className="mb-3 hidden items-center justify-between gap-3 min-[720px]:flex">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-36" />
      </div>
      {/* Mobile chip rail — dynamic count, common case ~6 */}
      <div className="mb-3 flex items-center gap-1.5 overflow-hidden min-[720px]:hidden">
        {SKELETON_CHIPS.map((chip) => (
          <Skeleton className={chip.className} key={chip.key} />
        ))}
      </div>
      <ProjectGridSkeleton />
    </div>
  );
}
