import type { ProjectWithVoteCount } from "@entities/vote";
import { formatRelativeShort } from "@shared/lib/format-relative";
import { cn } from "@shared/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@shared/ui/hover-card";
import Image from "next/image";
import Link from "next/link";
import { RankDot, RankSlot } from "./rank-badge";

export interface ProjectCardProps {
  /**
   * Human-readable class label for this row's `cohort_id`. Shown on the
   * mobile meta line (`{rank} · {cohortLabel}`). When `null` or `undefined`
   * — e.g. the project has no cohort assignment — the meta line renders
   * the rank number alone, with no trailing `·` or label.
   */
  cohortLabel?: string | null;
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

export function ProjectCard({
  project,
  rank,
  priority = false,
  screenshotUrl,
  viewerUserId,
  renderOwnerActions,
  renderVoteButton,
  cohortLabel = null,
}: ProjectCardProps) {
  const isOwner = viewerUserId != null && project.user_id === viewerUserId;
  const rankLabel = String(rank).padStart(2, "0");
  const author = project.author_display_name ?? "익명";
  // Card click navigates to the internal detail page. The external
  // project URL is exposed there via the "Visit project" CTA.
  const detailHref = project.id ? `/projects/${project.id}` : "/";
  const submittedAt = formatRelativeShort(project.created_at);
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
      className="group/row font-mono transition-colors hover:bg-muted min-[720px]:col-span-full min-[720px]:-mx-5 min-[720px]:grid min-[720px]:grid-cols-subgrid min-[720px]:px-5"
      data-testid="project-card"
    >
      {/* ─── Desktop row (≥ 720 px) ────────────────────────────── */}
      <div
        className="col-span-full hidden grid-cols-subgrid items-center py-3.5 min-[720px]:grid"
        data-testid="project-card-desktop"
      >
        <div className="flex items-center gap-1.5">
          <RankSlot rank={rank} />
          <span
            className={cn(
              "font-semibold text-xs tabular-nums",
              !hasRankDot && "text-muted-foreground"
            )}
          >
            {rankLabel}
          </span>
        </div>

        <HoverCard closeDelay={150} openDelay={150}>
          <HoverCardTrigger asChild>
            <Link
              className="relative block h-10 w-16 overflow-visible"
              data-testid="project-card-preview"
              href={detailHref}
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
            </Link>
          </HoverCardTrigger>
          {screenshotUrl ? (
            <HoverCardContent
              align="start"
              className="data-open:zoom-in-[0.97] data-closed:zoom-out-[0.97] w-auto border-border bg-popover p-0 duration-200 ease-out data-closed:duration-150 data-closed:ease-in"
              side="right"
              sideOffset={12}
            >
              <Image
                alt={`${project.title ?? "프로젝트"} 스크린샷 미리보기`}
                className="block h-[200px] w-[320px] object-cover"
                data-testid="project-card-preview-popover"
                height={200}
                sizes="320px"
                src={screenshotUrl}
                width={320}
              />
            </HoverCardContent>
          ) : null}
        </HoverCard>

        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            className="truncate font-heading font-medium text-sm leading-tight hover:underline"
            href={detailHref}
          >
            {project.title}
          </Link>
          <p className="truncate text-muted-foreground text-xs leading-tight">
            {project.tagline}
          </p>
        </div>

        <div className="min-w-0">
          <span className="block truncate text-xs">{author}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {ownerSlot}
          {voteSlot}
        </div>
      </div>

      {/* ─── Mobile stacked card (< 720 px) ────────────────────── */}
      <div
        className="flex flex-col gap-3 px-3.5 py-4 min-[720px]:hidden"
        data-testid="project-card-mobile"
      >
        {/* Meta line: rank · cohort */}
        <div
          className="flex items-center gap-2 font-mono text-[11px] tabular-nums"
          data-testid="project-card-mobile-meta"
        >
          <RankDot rank={rank} />
          <span
            className={cn(
              "font-semibold",
              !hasRankDot && "text-muted-foreground"
            )}
          >
            {rankLabel}
          </span>
          {cohortLabel ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span className="text-muted-foreground">{cohortLabel}</span>
            </>
          ) : null}
        </div>

        {/* Full-width 16:10 thumbnail */}
        <Link
          className="relative block aspect-[16/10] w-full overflow-hidden bg-muted"
          data-testid="project-card-mobile-preview"
          href={detailHref}
        >
          {screenshotUrl ? (
            <Image
              alt={`${project.title ?? "프로젝트"} 스크린샷`}
              className="object-cover"
              data-testid="project-card-mobile-thumb"
              fill
              priority={priority}
              sizes="(max-width: 720px) 100vw, 720px"
              src={screenshotUrl}
            />
          ) : (
            <span
              aria-hidden="true"
              className="block size-full bg-muted"
              data-testid="project-card-mobile-thumb"
            />
          )}
        </Link>

        {/* Title + tagline */}
        <div className="flex flex-col gap-1">
          <Link
            className="font-heading font-medium text-base leading-snug hover:underline"
            data-testid="project-card-mobile-title"
            href={detailHref}
          >
            {project.title}
          </Link>
          <p
            className="text-[13px] text-muted-foreground leading-snug"
            data-testid="project-card-mobile-tagline"
          >
            {project.tagline}
          </p>
        </div>

        {/* Bottom row: author · time | owner actions + vote */}
        <div
          className="flex items-center justify-between gap-3"
          data-testid="project-card-mobile-footer"
        >
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-medium text-[13px]">{author}</span>
            {submittedAt ? (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <span className="whitespace-nowrap text-muted-foreground text-xs">
                  {submittedAt}
                </span>
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {ownerSlot}
            {voteSlot}
          </div>
        </div>
      </div>
    </li>
  );
}
