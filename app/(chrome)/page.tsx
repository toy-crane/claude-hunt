import { fetchViewer } from "@shared/api/supabase/viewer";
import { fetchProjectCount } from "@widgets/header/server";
import {
  Eyebrow,
  ProjectsCtaCard,
  RunnerUpsSection,
  WinnerSpotlight,
} from "@widgets/winner-spotlight";
import { fetchMonthlyTopProjects } from "@widgets/winner-spotlight/server";
import type { Metadata } from "next";

const HOME_TITLE = "이달의 클로드 헌트";
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
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default async function Page() {
  const viewer = await fetchViewer();
  const [topProjects, projectCount] = await Promise.all([
    fetchMonthlyTopProjects({
      limit: 4,
      viewerUserId: viewer?.id ?? null,
    }),
    fetchProjectCount(),
  ]);

  const winner = topProjects[0];
  const runnerUps = topProjects.slice(1, 4);

  if (!winner) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 bg-background px-6 py-10 text-foreground">
        <Eyebrow />
        <ProjectsCtaCard projectCount={projectCount} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 bg-background px-6 py-10 text-foreground">
      <Eyebrow />
      <WinnerSpotlight winner={winner} />
      <RunnerUpsSection runnerUps={runnerUps} />
      <ProjectsCtaCard projectCount={projectCount} />
    </main>
  );
}
