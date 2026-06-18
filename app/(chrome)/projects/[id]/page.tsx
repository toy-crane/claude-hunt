import { fetchViewer } from "@shared/api/supabase/viewer";
import { SITE_URL } from "@shared/config/site";
import { cn } from "@shared/lib/utils";
import { Skeleton } from "@shared/ui/skeleton";
import {
  CommentList,
  CommentListSkeleton,
  fetchCommentThreads,
} from "@widgets/comment-list";
import {
  fetchProjectDetail,
  ImageGallery,
  ProjectActionBar,
  ProjectDescription,
  type ProjectDetail,
  ProjectSummary,
} from "@widgets/project-detail";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// Two stacked grids share this template so the description (left, row 2)
// lines up under the gallery and the comments (right, row 2) under the
// summary. Children carry explicit col/row placement so a null
// description or a project with no images never reshuffles the cells.
const SPOTLIGHT_GRID_CLASS =
  "lg:grid lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-x-7 lg:gap-y-8";

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
        ...(project.description && { description: project.description }),
        url: projectUrl,
        ...(project.primaryImageUrl && { image: project.primaryImageUrl }),
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
            item: projectUrl,
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
      images: project.primaryImageUrl
        ? [{ url: project.primaryImageUrl }]
        : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: project.primaryImageUrl ? [project.primaryImageUrl] : undefined,
    },
  };
}

export default function Page({ params }: PageProps) {
  // `params`, the auth cookie (fetchViewer), and the comment threads are all
  // request-bound, so the entire detail body streams in behind one Suspense
  // boundary. The cached project core (fetchProjectCore inside
  // fetchProjectDetail) still resolves from the cross-request cache.
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 bg-background p-6 pb-28 text-foreground md:pb-16 lg:max-w-6xl">
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetailContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProjectDetailContent({ params }: PageProps) {
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

  const hasImages = project.imageUrls.length > 0;

  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON.stringify of a server-controlled object built from typed project data — required for JSON-LD injection
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildProjectJsonLd(project)),
        }}
        type="application/ld+json"
      />
      <p
        className="font-mono text-[11px] text-muted-foreground"
        data-testid="project-detail-breadcrumb"
      >
        <span aria-hidden="true" className="text-accent-terracotta">
          $
        </span>{" "}
        claude-hunt show {project.title}
      </p>

      <div
        className={cn("flex flex-col gap-8", hasImages && SPOTLIGHT_GRID_CLASS)}
      >
        {hasImages ? (
          <ImageGallery
            className="lg:col-start-1 lg:row-start-1"
            imageUrls={project.imageUrls}
            title={project.title}
          />
        ) : null}
        <ProjectSummary
          className="lg:col-start-2 lg:row-start-1"
          isAuthenticated={Boolean(viewer)}
          project={project}
          viewerUserId={viewerId}
        />
        {project.description ? (
          <ProjectDescription
            className="lg:col-start-1 lg:row-start-2"
            description={project.description}
          />
        ) : null}
        <div className="lg:col-start-2 lg:row-start-2">
          <CommentList
            projectId={project.id}
            threads={threads}
            viewer={viewer}
          />
        </div>
      </div>

      <ProjectActionBar
        isAuthenticated={Boolean(viewer)}
        project={project}
        viewerUserId={viewerId}
      />
    </>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="project-detail-skeleton">
      <Skeleton className="h-3 w-48" />
      <div className={cn("flex flex-col gap-8", SPOTLIGHT_GRID_CLASS)}>
        <Skeleton className="aspect-[16/10] w-full lg:col-start-1 lg:row-start-1" />
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="lg:col-start-2 lg:row-start-2">
          <CommentListSkeleton />
        </div>
      </div>
    </div>
  );
}
