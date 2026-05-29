import { RiArrowRightLine, RiArrowUpFill } from "@remixicon/react";
import { formatRelativeKo } from "@shared/lib/format-relative";
import { SHIMMER_DATA_URL } from "@shared/lib/image/placeholder";
import Image from "next/image";
import Link from "next/link";
import type { MonthlyTopProject } from "../api/fetch-monthly-top-projects";

export interface WinnerSpotlightProps {
  winner: MonthlyTopProject;
}

export function WinnerSpotlight({ winner }: WinnerSpotlightProps) {
  const cohort = winner.cohort_label ?? "";
  const submittedAt = formatRelativeKo(winner.created_at);
  const author = winner.author_display_name ?? "익명";
  const authorInitial = author.charAt(0).toUpperCase();
  const href = `/projects/${winner.id}`;
  const screenshot = winner.screenshotUrl || SHIMMER_DATA_URL;

  return (
    <article className="grid grid-cols-1 overflow-hidden rounded-lg bg-card shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] md:grid-cols-[1.55fr_1fr]">
      <Link
        aria-label={`${winner.title} 프로젝트 보기`}
        className="relative block aspect-[16/10] overflow-hidden bg-muted"
        href={href}
      >
        <Image
          alt={`${winner.title} 스크린샷`}
          className="object-cover"
          fill
          placeholder={SHIMMER_DATA_URL}
          priority
          sizes="(max-width: 768px) 100vw, 60vw"
          src={screenshot}
        />
        <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded bg-foreground px-2.5 py-1.5 font-mono font-semibold text-[11px] text-background tracking-wide">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--term-rank-1)]" />
          <span>RANK 01 · 이달의 프로젝트</span>
        </div>
      </Link>

      <div className="flex flex-col justify-between gap-5 p-5 md:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
              {cohort.toUpperCase()}
              {submittedAt ? <> · {submittedAt}</> : null}
            </span>
            <h2 className="m-0 font-heading font-medium text-2xl leading-tight tracking-tight">
              {winner.title}
            </h2>
          </div>
          <p className="m-0 text-muted-foreground text-sm leading-relaxed">
            {winner.tagline}
          </p>
          <div className="inline-flex items-center gap-2 text-xs">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted font-heading font-medium text-[10px]">
              {authorInitial}
            </span>
            <span className="font-medium">{author}</span>
            <span className="text-muted-foreground">· 작성</span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-dashed pt-5">
          <div className="inline-flex min-w-16 flex-col items-center justify-center rounded-md bg-foreground px-3.5 py-2.5 font-mono text-background tabular-nums">
            <RiArrowUpFill aria-hidden="true" size={14} />
            <span className="mt-0.5 font-semibold text-base leading-none">
              {winner.vote_count ?? 0}
            </span>
          </div>
          <Link
            className="inline-flex flex-1 items-center justify-between rounded-md bg-muted px-3.5 py-2.5 font-mono text-foreground text-xs no-underline"
            href={href}
          >
            <span>프로젝트 자세히 보기</span>
            <RiArrowRightLine aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
