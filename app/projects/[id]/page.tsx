import { fetchViewer } from "@shared/api/supabase/viewer";
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
  const project = await fetchProjectDetail(id, viewer?.id ?? null);
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
          viewerUserId={viewer?.id ?? null}
        />
      </main>
      <Footer />
    </>
  );
}
