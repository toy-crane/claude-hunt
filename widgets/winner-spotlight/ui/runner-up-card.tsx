import { RiArrowUpLine } from "@remixicon/react";
import { SHIMMER_DATA_URL } from "@shared/lib/image/placeholder";
import { cn } from "@shared/lib/utils";
import type { ProjectGridRow } from "@widgets/project-grid/server";
import Image from "next/image";
import Link from "next/link";

export interface RunnerUpCardProps {
  project: ProjectGridRow;
  rank: number;
}

const RANK_DOT: Record<number, string> = {
  2: "bg-[var(--term-rank-2)]",
  3: "bg-[var(--term-rank-3)]",
};

export function RunnerUpCard({ project, rank }: RunnerUpCardProps) {
  const author = project.author_display_name ?? "익명";
  const cohort = project.cohort_label ?? "";
  const href = `/projects/${project.id}`;
  const screenshot = project.screenshotUrl || SHIMMER_DATA_URL;
  const dotClass = RANK_DOT[rank] ?? "bg-muted-foreground";

  return (
    <Link
      aria-label={`${project.title} 프로젝트 보기`}
      className="flex h-full flex-col overflow-hidden rounded-md bg-card text-inherit no-underline shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]"
      href={href}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <Image
          alt={`${project.title} 스크린샷`}
          className="object-cover"
          fill
          placeholder={SHIMMER_DATA_URL}
          sizes="(max-width: 768px) 80vw, 25vw"
          src={screenshot}
        />
        <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-sm bg-background px-2 py-1 font-mono font-semibold text-[10px] shadow-sm">
          <span className={cn("h-[5px] w-[5px] rounded-full", dotClass)} />
          <span>{String(rank).padStart(2, "0")}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h4 className="m-0 font-heading font-medium text-sm leading-snug">
          {project.title}
        </h4>
        <p className="m-0 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
          {project.tagline}
        </p>
        <div className="mt-auto flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{author}</span>
            {cohort ? ` · ${cohort}` : null}
          </span>
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-foreground">
            <RiArrowUpLine aria-hidden="true" size={12} />
            {project.vote_count ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
