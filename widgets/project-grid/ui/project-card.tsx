import type { ProjectWithVoteCount } from "@entities/vote";
import { cn } from "@shared/lib/utils";
import Image from "next/image";
import { RankDot } from "./rank-badge";

export interface ProjectCardProps {
  /**
   * Eagerly loads the screenshot and marks it as high-priority for LCP.
   * Set only on above-the-fold rows (top-3). Defaults to false.
   */
  priority?: boolean;
  project: ProjectWithVoteCount;
  rank: number;
  /**
   * Slot for owner-only controls (edit + delete buttons). Rendered only
   * when `viewerUserId === project.user_id`.
   */
  renderOwnerActions?: (project: ProjectWithVoteCount) => React.ReactNode;
  /**
   * Slot for the vote button. Rendered for every viewer; the feature
   * itself decides whether to show a sign-in prompt, a toggle, or a
   * read-only indicator based on viewer state.
   */
  renderVoteButton?: (project: ProjectWithVoteCount) => React.ReactNode;
  screenshotUrl: string;
  /**
   * `auth.uid()` of the current viewer, if any. Used to decide whether
   * the owner-actions slot is rendered.
   */
  viewerUserId?: string | null;
}

const ROW_GRID_COLS = "grid-cols-[52px_72px_minmax(0,1fr)_130px_auto]";

export function ProjectCard({
  project,
  rank,
  priority = false,
  screenshotUrl,
  viewerUserId,
  renderOwnerActions,
  renderVoteButton,
}: ProjectCardProps) {
  const isOwner = viewerUserId != null && project.user_id === viewerUserId;
  const rankLabel = String(rank).padStart(2, "0");
  const author = project.author_display_name ?? "익명";
  const authorInitial = author.charAt(0);
  const projectUrl = project.project_url ?? "#";

  return (
    <li
      className={cn(
        "group/row grid items-center gap-4 border-border border-t px-5 py-3.5 font-mono transition-colors hover:bg-muted",
        ROW_GRID_COLS
      )}
      data-testid="project-card"
    >
      {/* RANK */}
      <div className="flex items-center gap-2">
        <RankDot rank={rank} />
        <span
          className={cn(
            "font-semibold text-xs tabular-nums",
            rank > 3 && "text-muted-foreground"
          )}
        >
          {rankLabel}
        </span>
      </div>

      {/* PREVIEW */}
      <a
        className="relative block h-10 w-16 overflow-visible"
        data-testid="project-card-preview"
        href={projectUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        {screenshotUrl ? (
          <Image
            alt={`${project.title ?? "프로젝트"} 스크린샷`}
            className="h-10 w-16 origin-left object-cover transition-transform duration-200 ease-out group-hover/row:scale-[1.08]"
            data-testid="project-card-thumb"
            height={40}
            priority={priority}
            sizes="64px"
            src={screenshotUrl}
            width={64}
          />
        ) : (
          <span
            aria-hidden="true"
            className="block h-10 w-16 bg-muted"
            data-testid="project-card-thumb"
          />
        )}
      </a>

      {/* NAME */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <a
          className="truncate font-heading font-medium text-sm leading-tight hover:underline"
          href={projectUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {project.title}
        </a>
        <p className="truncate text-muted-foreground text-xs leading-tight">
          {project.tagline}
        </p>
      </div>

      {/* AUTHOR */}
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[10px]"
        >
          {authorInitial}
        </span>
        <span className="truncate text-xs">{author}</span>
      </div>

      {/* VOTES (+ owner actions slot) */}
      <div className="flex items-center gap-1.5 justify-self-end">
        {isOwner && renderOwnerActions ? (
          <div
            className="flex items-center gap-1.5"
            data-testid="project-card-owner-actions"
          >
            {renderOwnerActions(project)}
          </div>
        ) : null}
        {renderVoteButton ? renderVoteButton(project) : null}
      </div>
    </li>
  );
}
