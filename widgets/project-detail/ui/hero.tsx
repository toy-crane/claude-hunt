import { VoteButton } from "@features/toggle-vote";
import {
  RiExternalLinkLine,
  RiGithubLine,
  RiGroupLine,
  RiUserLine,
} from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar";
import { Badge } from "@shared/ui/badge";
import { Button } from "@shared/ui/button";
import Link from "next/link";
import type { ProjectDetail } from "../api/queries";
import { ImageGallery } from "./image-gallery";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatRelative(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }
  const diff = Math.max(0, Date.now() - then);
  const days = Math.floor(diff / DAY_MS);
  if (days > 0) {
    return `${days}일 전`;
  }
  const hours = Math.floor(diff / HOUR_MS);
  if (hours > 0) {
    return `${hours}시간 전`;
  }
  const mins = Math.floor(diff / MINUTE_MS);
  if (mins > 0) {
    return `${mins}분 전`;
  }
  return "방금";
}

export interface HeroProps {
  isAuthenticated: boolean;
  project: ProjectDetail;
  viewerUserId: string | null;
}

/**
 * Read-only header for the project detail page. Lays out the title,
 * full tagline, meta line (cohort · author · time), the primary image,
 * the action row (vote + Visit project, Pattern A), and a conditional
 * GitHub text link below.
 *
 * Owner edit/delete affordances and the multi-image gallery land in
 * later tasks (T10, T9). Anonymous visitors see exactly the same DOM.
 */
export function Hero({ project, isAuthenticated, viewerUserId }: HeroProps) {
  const ownedByViewer =
    viewerUserId != null && project.user_id === viewerUserId;
  const submittedAt = formatRelative(project.created_at);
  const authorInitial = (project.author_display_name ?? "익명").charAt(0);

  return (
    <article className="flex flex-col gap-4">
      {/* Back link */}
      <div>
        <Link
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          href="/"
        >
          ← 보드로 돌아가기
        </Link>
      </div>

      {/* Title + tagline */}
      <header className="flex flex-col gap-2">
        <h1 className="font-heading font-medium text-2xl">{project.title}</h1>
        <p
          className="whitespace-pre-line text-base leading-relaxed"
          data-testid="project-detail-tagline"
        >
          {project.tagline}
        </p>
      </header>

      {/* Meta line: cohort · author · time */}
      <div
        className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm"
        data-testid="project-detail-meta"
      >
        {project.cohort_name ? (
          <Badge className="gap-1" variant="secondary">
            <RiGroupLine aria-hidden="true" className="size-3" />
            {project.cohort_name}
          </Badge>
        ) : null}
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Avatar className="size-5">
            {project.author_avatar_url ? (
              <AvatarImage
                alt={project.author_display_name ?? ""}
                src={project.author_avatar_url}
              />
            ) : null}
            <AvatarFallback>
              {authorInitial === "" ? (
                <RiUserLine aria-label="작성자" />
              ) : (
                authorInitial
              )}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground">
            {project.author_display_name ?? "익명"}
          </span>
        </span>
        {submittedAt ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{submittedAt}</span>
          </>
        ) : null}
      </div>

      {/* Image gallery (primary + thumb strip + arrows; arrows wrap) */}
      {project.imageUrls.length > 0 ? (
        <ImageGallery imageUrls={project.imageUrls} title={project.title} />
      ) : null}

      {/* Action row (Pattern A): vote pill + Visit project. GitHub link below. */}
      <div className="flex flex-col gap-2" data-testid="project-detail-actions">
        <div className="flex items-stretch gap-3">
          <VoteButton
            alreadyVoted={project.viewer_has_voted}
            isAuthenticated={isAuthenticated}
            ownedByViewer={ownedByViewer}
            projectId={project.id}
            variant="stacked"
            voteCount={project.vote_count}
          />
          <Button asChild className="gap-2">
            <a
              href={project.project_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <RiExternalLinkLine aria-hidden="true" />
              Visit project
            </a>
          </Button>
        </div>
        {project.github_url ? (
          <a
            className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
            data-testid="project-detail-github-link"
            href={project.github_url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <RiGithubLine aria-hidden="true" className="size-3.5" />
            <span className="underline underline-offset-2">
              GitHub 저장소 보기
            </span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
