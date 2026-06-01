import { VoteButton } from "@features/toggle-vote";
import {
  RiExternalLinkLine,
  RiGithubLine,
  RiGroupLine,
} from "@remixicon/react";
import { formatRelativeKo } from "@shared/lib/format-relative";
import { Badge } from "@shared/ui/badge";
import { Button } from "@shared/ui/button";
import Link from "next/link";
import type { ProjectDetail } from "../api/fetch-project-detail";
import { ImageGallery } from "./image-gallery";
import { OwnerControls } from "./owner-controls";

// Collapse every newline run in the tagline into a single space so a legacy
// multi-line tagline still renders as one line (the field is one-liner now).
const TAGLINE_NEWLINES = /\s*\n+\s*/g;
// Cap consecutive blank lines in the description at a single blank line.
const DESCRIPTION_BLANK_LINES = /\n{3,}/g;

export interface HeroProps {
  isAuthenticated: boolean;
  project: ProjectDetail;
  viewerUserId: string | null;
}

/**
 * Read-only header for the project detail page. Lays out the title,
 * full tagline, meta line (cohort · author · time), the primary
 * image gallery, and the Visit-project CTA. The upvote sits in the
 * header's top-right next to optional owner controls so the primary
 * action is visible immediately.
 */
export function Hero({ project, isAuthenticated, viewerUserId }: HeroProps) {
  const ownedByViewer =
    viewerUserId != null && project.user_id === viewerUserId;
  const submittedAt = formatRelativeKo(project.created_at);
  const tagline = project.tagline.replace(TAGLINE_NEWLINES, " ").trim();

  return (
    <article className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-heading font-medium text-2xl">{project.title}</h1>
          <p
            className="text-base leading-relaxed"
            data-testid="project-detail-tagline"
          >
            {tagline}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <VoteButton
            alreadyVoted={project.viewer_has_voted}
            isAuthenticated={isAuthenticated}
            ownedByViewer={ownedByViewer}
            projectId={project.id}
            variant="inline"
            voteCount={project.vote_count}
          />
          {ownedByViewer ? (
            <OwnerControls
              projectId={project.id}
              projectTitle={project.title}
            />
          ) : null}
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm"
        data-testid="project-detail-meta"
      >
        {project.cohort_id && project.cohort_label ? (
          <>
            <Badge asChild className="gap-1" variant="outline">
              <Link
                href={`/projects?cohort=${encodeURIComponent(project.cohort_id)}`}
              >
                <RiGroupLine aria-hidden="true" className="size-3" />
                {project.cohort_label}
              </Link>
            </Badge>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <span className="text-foreground">
          {project.author_display_name ?? "익명"}
        </span>
        {submittedAt ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{submittedAt}</span>
          </>
        ) : null}
      </div>

      {project.imageUrls.length > 0 ? (
        <ImageGallery imageUrls={project.imageUrls} title={project.title} />
      ) : null}

      {project.description ? (
        <section
          className="whitespace-pre-line text-pretty text-base leading-relaxed"
          data-testid="project-detail-description"
        >
          {project.description.replace(DESCRIPTION_BLANK_LINES, "\n\n")}
        </section>
      ) : null}

      <div
        className="flex flex-col items-end gap-2"
        data-testid="project-detail-actions"
      >
        <Button asChild className="gap-2">
          <a
            href={project.project_url}
            rel="noopener noreferrer ugc"
            target="_blank"
          >
            <RiExternalLinkLine aria-hidden="true" />
            프로젝트 방문하기
          </a>
        </Button>
        {project.github_url ? (
          <Button asChild size="sm" variant="link">
            <a
              data-testid="project-detail-github-link"
              href={project.github_url}
              rel="noopener noreferrer ugc"
              target="_blank"
            >
              <RiGithubLine aria-hidden="true" />
              소스코드 보기
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
