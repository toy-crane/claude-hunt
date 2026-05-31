import { fetchViewer } from "@shared/api/supabase/viewer";
import { SITE_URL } from "@shared/config/site";
import { CommentList, fetchCommentThreads } from "@widgets/comment-list";
import {
  fetchProjectDetail,
  Hero,
  type ProjectDetail,
} from "@widgets/project-detail";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function buildProjectJsonLd(project: ProjectDetail) {
  const projectUrl = `${SITE_URL}/projects/${project.id}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        name: project.title,
        abstract: project.tagline,
        url: projectUrl,
        ...(project.primaryScreenshotUrl && {
          image: project.primaryScreenshotUrl,
        }),
        ...(project.author_display_name && {
          author: {
            "@type": "Person",
            name: project.author_display_name,
          },
        }),
        dateCreated: project.created_at,
        dateModified: project.updated_at,
        inLanguage: "ko",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "클로드 헌트",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: project.title,
          },
        ],
      },
    ],
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await fetchProjectDetail(id, null);
  if (!project) {
    return {
      title: { absolute: "프로젝트를 찾을 수 없어요 — 클로드 헌트" },
    };
  }
  const description = project.tagline;
  const title = `${project.title} — 클로드 헌트`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/projects/${project.id}` },
    openGraph: {
      title,
      description,
      url: `/projects/${project.id}`,
      images: project.primaryScreenshotUrl
        ? [{ url: project.primaryScreenshotUrl }]
        : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: project.primaryScreenshotUrl
        ? [project.primaryScreenshotUrl]
        : undefined,
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
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 bg-background p-6 pb-24 text-foreground">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON.stringify of a server-controlled object built from typed project data — required for JSON-LD injection
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildProjectJsonLd(project)),
        }}
        type="application/ld+json"
      />
      <Hero
        isAuthenticated={Boolean(viewer)}
        project={project}
        viewerUserId={viewerId}
      />
      <CommentList projectId={project.id} threads={threads} viewer={viewer} />
    </main>
  );
}
