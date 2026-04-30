import { fetchViewer } from "@shared/api/supabase/viewer";
import { CommentList, fetchCommentThreads } from "@widgets/comment-list";
import { Footer } from "@widgets/footer";
import { Header } from "@widgets/header";
import { fetchProjectDetail, Hero } from "@widgets/project-detail";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await fetchProjectDetail(id, null);
  if (!project) {
    return {
      title: "프로젝트를 찾을 수 없어요 — claude-hunt",
    };
  }
  const description = project.tagline;
  const cohort = project.cohort_label ? ` · ${project.cohort_label}` : "";
  return {
    title: `${project.title}${cohort} — claude-hunt`,
    description,
    openGraph: {
      title: project.title,
      description,
      url: `/projects/${project.id}`,
      images: project.primaryImageUrl
        ? [{ url: project.primaryImageUrl }]
        : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: project.primaryImageUrl ? [project.primaryImageUrl] : undefined,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const viewer = await fetchViewer();
  const viewerId = viewer?.id ?? null;
  const [project, threads] = await Promise.all([
    fetchProjectDetail(id, viewerId),
    fetchCommentThreads(id, viewerId),
  ]);
  if (!project) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 bg-background p-6 pb-24 text-foreground">
        <Hero
          isAuthenticated={Boolean(viewer)}
          project={project}
          viewerUserId={viewerId}
        />
        <CommentList
          isAuthenticated={Boolean(viewer)}
          projectId={project.id}
          threads={threads}
          viewerUserId={viewerId}
        />
      </main>
      <Footer />
    </>
  );
}
