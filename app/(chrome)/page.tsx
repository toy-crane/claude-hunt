import { fetchCohorts } from "@features/cohort-filter/server";
import { SubmitTrigger } from "@features/submit-project";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { fetchProjects } from "@widgets/project-grid/server";
import type { Metadata } from "next";
import { ProjectBoard } from "./_components/project-board";

// Absolute (no template) keeps the SERP title under ~60 chars.
const HOME_TITLE = "claude-hunt — 오늘의 Claude Hunt";
const HOME_DESCRIPTION =
  "Claude Code 수강생들이 만든 작품을 둘러보고 응원해 주세요.";
const HOME_HERO_HEADING = "오늘의 Claude Hunt";
const HOME_HERO_LEAD = "수강생들이 만든 작품을 둘러보고 응원해 주세요.";

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading font-medium text-3xl">
            {HOME_HERO_HEADING}
          </h1>
          <p className="text-muted-foreground">{HOME_HERO_LEAD}</p>
        </div>
        <SubmitTrigger isAuthenticated={Boolean(viewer)} />
      </header>
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
