import { Skeleton } from "@shared/ui/skeleton";
import { fetchProjectCount } from "@widgets/header/server";
import {
  Eyebrow,
  ProjectsCtaCard,
  RunnersUpSection,
  RunnersUpSkeleton,
  WinnerSpotlight,
  WinnerSpotlightSkeleton,
} from "@widgets/winner-spotlight";
import { fetchMonthlyTopProjects } from "@widgets/winner-spotlight/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

const HOME_TITLE = "이달의 프로젝트 — 클로드 헌트";
const HOME_DESCRIPTION =
  "이번 달 1위 프로젝트와 함께 사랑받은 인기 프로젝트들을 만나보세요.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
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
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 bg-background px-6 py-10 text-foreground">
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </main>
  );
}

export async function HomeContent() {
  // The spotlight reflects the *current* month, so this render reads the
  // request clock. `connection()` opts the subtree into dynamic rendering
  // (legitimizing `new Date()` downstream in `fetchMonthlyTopProjects`)
  // while the cached project queries still resolve from the `projects` cache.
  await connection();

  const [monthly, projectCount] = await Promise.all([
    fetchMonthlyTopProjects({ limit: 4 }),
    fetchProjectCount(),
  ]);

  const { projects, monthSlug, monthLabel } = monthly;
  const winner = projects[0];
  const runnersUp = projects.slice(1, 4);

  if (!winner) {
    return (
      <>
        <Eyebrow monthLabel={monthLabel} monthSlug={monthSlug} />
        <ProjectsCtaCard projectCount={projectCount} />
      </>
    );
  }

  return (
    <>
      <Eyebrow monthLabel={monthLabel} monthSlug={monthSlug} />
      <WinnerSpotlight winner={winner} />
      <RunnersUpSection runnersUp={runnersUp} />
      <ProjectsCtaCard projectCount={projectCount} />
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-8" data-testid="home-skeleton">
      {/* Eyebrow: prompt line + title + subtitle */}
      <div className="flex flex-col items-start gap-2">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>

      <WinnerSpotlightSkeleton />
      <RunnersUpSkeleton />

      {/* ProjectsCtaCard */}
      <div className="mt-2 flex items-center justify-between rounded-md border border-dashed bg-background px-6 py-5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}
