import type { ProjectWithVoteCount } from "@entities/vote/index.ts";
import { RiThumbUpLine } from "@remixicon/react";
import { RankBadge } from "./rank-badge.tsx";

export interface ProjectCardProps {
  project: ProjectWithVoteCount;
  rank: number;
  screenshotUrl: string;
}

export function ProjectCard({
  project,
  rank,
  screenshotUrl,
}: ProjectCardProps) {
  const voteCount = project.vote_count ?? 0;
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
        {/** biome-ignore lint/performance/noImgElement: avatar/screenshot served from supabase storage — next/image config not set up yet */}
        <img
          alt={`${project.title ?? "Project"} screenshot`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          height={360}
          loading="lazy"
          src={screenshotUrl}
          width={640}
        />
        {rank >= 1 && rank <= 3 ? (
          <RankBadge className="absolute top-2 left-2 shadow" rank={rank} />
        ) : null}
      </a>
      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <a
            className="font-heading font-medium text-sm leading-tight hover:underline"
            href={project.project_url ?? "#"}
            rel="noopener noreferrer"
            target="_blank"
          >
            {project.title}
          </a>
          <span
            className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs"
            data-testid="vote-count"
          >
            <RiThumbUpLine aria-hidden="true" className="size-3.5" />
            {voteCount}
          </span>
        </div>
        <p className="line-clamp-2 text-muted-foreground text-xs/relaxed">
          {project.tagline}
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          by{" "}
          <span className="font-medium text-foreground">
            {project.author_display_name ?? "Anonymous"}
          </span>
        </p>
      </div>
    </article>
  );
}
