import type { ProjectWithVoteCount } from "@entities/vote";
import Image from "next/image";
import { RankBadge } from "./rank-badge";

export interface ProjectCardProps {
  /**
   * Eagerly loads the screenshot and marks it as high-priority for LCP.
   * Set only on above-the-fold cards (top-3). Defaults to false.
   */
  priority?: boolean;
  project: ProjectWithVoteCount;
  rank: number;
  /**
   * Slot for owner-only controls (edit + delete buttons). Rendered only
   * when `viewerUserId === project.user_id`. Kept as a render prop so
   * the widget layer doesn't import individual features.
   */
  renderOwnerActions?: (project: ProjectWithVoteCount) => React.ReactNode;
  /**
   * Slot for the vote button. Rendered for every viewer (the feature
   * itself decides whether to show a "Sign in" prompt, a toggle, or
   * a read-only indicator based on viewer state).
   */
  renderVoteButton?: (project: ProjectWithVoteCount) => React.ReactNode;
  screenshotUrl: string;
  /**
   * Optional `auth.uid()` of the current viewer. Used to decide whether
   * to render the owner actions slot (edit / delete triggers). `null`
   * means anonymous or not-the-owner.
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
}: ProjectCardProps) {
  const isOwner = viewerUserId != null && project.user_id === viewerUserId;
  return (
    <article
      className="group flex flex-col overflow-hidden rounded-md bg-card ring-1 ring-foreground/10"
      data-testid="project-card"
    >
      <a
        className="relative block aspect-video w-full overflow-hidden bg-muted"
        href={project.project_url ?? "#"}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Image
          alt={`${project.title ?? "프로젝트"} 스크린샷`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          height={360}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={screenshotUrl}
          width={640}
        />
        {rank >= 1 && rank <= 3 ? (
          <RankBadge className="absolute top-2 left-2 shadow" rank={rank} />
        ) : null}
      </a>
      <div className="flex gap-3 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <a
            className="font-heading font-medium text-sm leading-tight hover:underline"
            href={project.project_url ?? "#"}
            rel="noopener noreferrer"
            target="_blank"
          >
            {project.title}
          </a>
          <p className="line-clamp-2 text-muted-foreground text-xs/relaxed">
            {project.tagline}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            <span className="font-medium text-foreground">
              {project.author_display_name ?? "익명"}
            </span>
            <span aria-hidden="true"> · 작성</span>
          </p>
          {isOwner && renderOwnerActions ? (
            <div
              className="mt-2 flex items-center gap-2"
              data-testid="project-card-owner-actions"
            >
              {renderOwnerActions(project)}
            </div>
          ) : null}
        </div>
        {renderVoteButton ? (
          <div className="shrink-0 self-start">{renderVoteButton(project)}</div>
        ) : null}
      </div>
    </article>
  );
}
