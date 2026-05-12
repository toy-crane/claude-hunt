import { fetchCohorts } from "@features/cohort-filter/server";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { fetchProjects } from "@widgets/project-grid/server";
import type { Metadata } from "next";
import { ProjectBoard } from "./_components/project-board";

// Brand-first absolute title bypasses the layout template so the SERP
// listing reads naturally and stays under 60 chars.
const HOME_TITLE = "claude-hunt — Claude Code 코호트가 만든 프로젝트 보드";
const HOME_DESCRIPTION =
  "Claude Code 코호트 동료들이 함께 빌드한 프로젝트를 둘러보고, 마음에 드는 작품에 응원을 보내주세요.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    type: "website",
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

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
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 bg-background p-6 text-foreground">
      <ProjectBoard
        cohorts={cohorts}
        initialCohortId={selectedCohortId}
        isAuthenticated={Boolean(viewer)}
        projects={projects}
        viewerUserId={viewer?.id ?? null}
      />
    </main>
  );
}
