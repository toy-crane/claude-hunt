import { fetchViewer } from "@shared/api/supabase/viewer";
import { CommentList, fetchCommentThreads } from "@widgets/comment-list";
import { Footer } from "@widgets/footer";
import { Header } from "@widgets/header";
import { fetchProjectDetail, Hero } from "@widgets/project-detail";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
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
      <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 bg-background p-6 text-foreground">
        <Hero
          isAuthenticated={Boolean(viewer)}
          project={project}
          viewerUserId={viewerId}
        />
        <CommentList
          isAuthenticated={Boolean(viewer)}
          projectId={project.id}
          threads={threads}
        />
      </main>
      <Footer />
    </>
  );
}
