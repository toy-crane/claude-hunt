import { VoteButton } from "@features/toggle-vote";
import {
  RiExternalLinkLine,
  RiGithubLine,
  RiGroupLine,
} from "@remixicon/react";
import { formatRelativeKo } from "@shared/lib/format-relative";
import { flattenToSingleLine } from "@shared/lib/text";
import { cn } from "@shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar";
import { Button } from "@shared/ui/button";
import Link from "next/link";
import type { ProjectDetail } from "../api/fetch-project-detail";
import { OwnerControls } from "./owner-controls";

const SECLABEL_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground";

export interface ProjectSummaryProps {
  /** Extra classes for the summary root (e.g. grid placement). */
  className?: string;
  isAuthenticated: boolean;
  project: ProjectDetail;
  viewerUserId: string | null;
}

/**
 * Right column of the spotlight detail layout: the cohort·time eyebrow
 * with owner controls, the title + tagline, the author row, and the
 * action cluster. On desktop the actions row holds the upvote, the visit
 * CTA, and the GitHub link; on mobile the upvote + visit move to a fixed
 * bottom bar ({@link ProjectActionBar}) and only the GitHub link stays
 * inline here.
 */
export function ProjectSummary({
  className,
  isAuthenticated,
  project,
  viewerUserId,
}: ProjectSummaryProps) {
  const ownedByViewer =
    viewerUserId != null && project.user_id === viewerUserId;
  const submittedAt = formatRelativeKo(project.created_at);
  const tagline = flattenToSingleLine(project.tagline);
  const authorName = project.author_display_name ?? "익명";

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn("flex flex-wrap items-center gap-1.5", SECLABEL_CLASS)}
          data-testid="project-detail-meta"
        >
          {project.cohort_id && project.cohort_label ? (
            <>
              <Link
                className="inline-flex items-center gap-1 hover:text-foreground"
                href={`/projects?cohort=${encodeURIComponent(project.cohort_id)}`}
              >
                <RiGroupLine aria-hidden="true" className="size-3" />
                {project.cohort_label}
              </Link>
              {submittedAt ? <span aria-hidden="true">·</span> : null}
            </>
          ) : null}
          {submittedAt ? <span>{submittedAt}</span> : null}
        </div>
        {ownedByViewer ? (
          <OwnerControls projectId={project.id} projectTitle={project.title} />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading font-medium text-2xl">{project.title}</h1>
        <p
          className="text-base text-muted-foreground leading-relaxed"
          data-testid="project-detail-tagline"
        >
          {tagline}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Avatar size="sm">
          {project.author_avatar_url ? (
            <AvatarImage alt="" src={project.author_avatar_url} />
          ) : null}
          <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{authorName}</span>
        <span className="text-muted-foreground">· 제출</span>
      </div>

      <div
        className="hidden items-stretch gap-2 border-border border-t border-dashed pt-4 md:flex"
        data-testid="project-detail-actions"
      >
        <VoteButton
          alreadyVoted={project.viewer_has_voted}
          isAuthenticated={isAuthenticated}
          ownedByViewer={ownedByViewer}
          projectId={project.id}
          testIdSuffix="desktop"
          variant="stacked"
          voteCount={project.vote_count}
        />
        <Button asChild className="flex-1 gap-2">
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
          <Button asChild variant="outline">
            <a
              data-testid="project-detail-github-link"
              href={project.github_url}
              rel="noopener noreferrer ugc"
              target="_blank"
            >
              <RiGithubLine aria-hidden="true" />
              GitHub
            </a>
          </Button>
        ) : null}
      </div>

      {project.github_url ? (
        <div className="border-border border-t border-dashed pt-4 md:hidden">
          <a
            className="inline-flex items-center gap-1.5 text-foreground text-sm hover:underline"
            data-testid="project-detail-github-link-mobile"
            href={project.github_url}
            rel="noopener noreferrer ugc"
            target="_blank"
          >
            <RiGithubLine aria-hidden="true" className="size-4" />
            GitHub 저장소
          </a>
        </div>
      ) : null}
    </section>
  );
}
