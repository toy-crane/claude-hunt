import { Skeleton } from "@shared/ui/skeleton";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ProjectBoardSection } from "./_components/project-board-section";

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
  // Static shell: only the heading prerenders. The board reads searchParams
  // and the auth session (request-time), so it streams behind <Suspense>.
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 bg-background p-6 text-foreground">
      <h1 className="font-heading font-medium text-3xl">프로젝트 보드</h1>
      <Suspense fallback={<ProjectBoardFallback />}>
        <ProjectBoardSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const FALLBACK_CARD_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

function ProjectBoardFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FALLBACK_CARD_KEYS.map((key) => (
          <Skeleton className="h-48 w-full" key={key} />
        ))}
      </div>
    </div>
  );
}
