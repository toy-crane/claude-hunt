import { EditForm } from "@features/edit-project";
import { fetchViewer } from "@shared/api/supabase/viewer";
import { Footer } from "@widgets/footer";
import { Header } from "@widgets/header";
import { fetchProjectDetail } from "@widgets/project-detail";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const viewer = await fetchViewer();
  if (!viewer) {
    redirect("/login");
  }

  const project = await fetchProjectDetail(id, viewer.id);
  if (!project) {
    notFound();
  }
  // Owner-only — non-owners get a 404 (least-info disclosure).
  if (project.user_id !== viewer.id) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 bg-background p-6 text-foreground">
        <Link
          className="inline-flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          href={`/projects/${project.id}`}
        >
          ← 상세 페이지로 돌아가기
        </Link>
        <header className="flex flex-col gap-1">
          <h1 className="font-heading font-medium text-2xl">프로젝트 편집</h1>
          <p className="text-muted-foreground text-sm">
            저장하면 보드와 상세 페이지가 즉시 갱신돼요.
          </p>
        </header>
        <EditForm
          initial={{
            projectId: project.id,
            title: project.title,
            tagline: project.tagline,
            projectUrl: project.project_url,
            githubUrl: project.github_url,
            imageUrls: project.imageUrls,
            imagePaths: project.images.map((img) => img.path),
          }}
        />
      </main>
      <Footer />
    </>
  );
}
