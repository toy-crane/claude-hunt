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
    return `${days}d`;
  }
  const hours = Math.floor(diff / HOUR_MS);
  if (hours > 0) {
    return `${hours}h`;
  }
  const mins = Math.floor(diff / MINUTE_MS);
  if (mins > 0) {
    return `${mins}m`;
  }
  return "방금";
}

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
  const submittedAt = formatRelative(project.created_at);
  const hasRankDot = rank >= 1 && rank <= 3;

  const voteSlot = renderVoteButton ? renderVoteButton(project) : null;
  const ownerSlot =
    isOwner && renderOwnerActions ? (
      <div
        className="flex items-center gap-1.5"
        data-testid="project-card-owner-actions"
      >
        {renderOwnerActions(project)}
      </div>
    ) : null;

  return (
    <li
      className="group/row border-border border-t font-mono transition-colors hover:bg-muted"
      data-testid="project-card"
    >
      {/* ─── Desktop row (≥ 720 px) ────────────────────────────── */}
      <div
        className={cn(
          "hidden items-center gap-4 px-5 py-3.5 min-[720px]:grid",
          ROW_GRID_COLS
        )}
        data-testid="project-card-desktop"
      >
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

        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[10px]"
          >
            {authorInitial}
          </span>
          <span className="truncate text-xs">{author}</span>
        </div>

        <div className="flex items-center gap-1.5 justify-self-end">
          {ownerSlot}
          {voteSlot}
        </div>
      </div>

      {/* ─── Mobile row (< 720 px) ────────────────────────────── */}
      <div
        className="flex h-16 items-center gap-3 px-3 min-[720px]:hidden"
        data-testid="project-card-mobile"
      >
        <a
          className="relative block size-12 shrink-0 overflow-hidden"
          data-testid="project-card-mobile-preview"
          href={projectUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {screenshotUrl ? (
            <Image
              alt={`${project.title ?? "프로젝트"} 스크린샷`}
              className="size-12 object-cover"
              data-testid="project-card-mobile-thumb"
              height={48}
              priority={priority}
              sizes="48px"
              src={screenshotUrl}
              width={48}
            />
          ) : (
            <span
              aria-hidden="true"
              className="block size-12 bg-muted"
              data-testid="project-card-mobile-thumb"
            />
          )}
          <span
            className={cn(
              "absolute top-0.5 left-0.5 inline-flex items-center gap-0.5 rounded-none border border-border bg-background px-1 py-px font-semibold text-[9px] tabular-nums leading-none",
              !hasRankDot && "text-muted-foreground"
            )}
            data-testid="project-card-mobile-rank-badge"
          >
            <RankDot className="size-1" rank={rank} />
            {rankLabel}
          </span>
        </a>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <a
            className="truncate font-heading font-medium text-[13px] leading-tight hover:underline"
            href={projectUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {project.title}
          </a>
          <span className="truncate text-[11px] text-muted-foreground leading-tight">
            {project.tagline}
          </span>
          <span className="truncate text-[10px] text-muted-foreground leading-tight">
            {author}
            {submittedAt ? ` · ${submittedAt}` : ""}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {ownerSlot}
          {voteSlot}
        </div>
      </div>
    </li>
  );
}
