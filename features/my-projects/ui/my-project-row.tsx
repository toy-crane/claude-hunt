import { RiArrowUpLine } from "@remixicon/react";
import { formatDateYmd } from "@shared/lib/format-date";
import { SHIMMER_DATA_URL } from "@shared/lib/screenshot";
import Image from "next/image";
import type { ReactNode } from "react";
import type { MyProjectRow as MyProjectRowData } from "../api/fetch-my-projects";

export interface MyProjectRowProps {
  /**
   * Slot rendered in the trailing action cell. The list owner composes
   * edit/delete controls here so this feature slice never has to know
   * about peer slices (e.g. @features/delete-project), respecting the
   * FSD "no cross-slice imports on the same layer" rule.
   */
  actions?: ReactNode;
  project: MyProjectRowData;
}

export function MyProjectRow({ project, actions }: MyProjectRowProps) {
  const title = project.title ?? "";
  const submittedAt = formatDateYmd(project.created_at);
  const voteCount = project.vote_count ?? 0;

  return (
    <div
      className="group/row grid grid-cols-[40px_1fr_auto] items-center gap-2.5 border-border border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50 min-[720px]:grid-cols-[62px_1fr_56px_72px_72px] min-[720px]:gap-2.5 min-[720px]:px-3 min-[720px]:py-2"
      data-testid="my-project-row"
    >
      {/* Thumbnail — 40×40 on mobile, 48×27 on desktop */}
      <div className="relative size-10 shrink-0 overflow-hidden bg-muted min-[720px]:h-[27px] min-[720px]:w-12">
        {project.screenshotUrl ? (
          <Image
            alt={`${title} 스크린샷`}
            className="object-cover"
            fill
            placeholder={SHIMMER_DATA_URL}
            sizes="(max-width: 720px) 40px, 48px"
            src={project.screenshotUrl}
          />
        ) : null}
      </div>

      {/* Title + tagline (desktop) / Title + meta (mobile) */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium font-mono text-[13px] min-[720px]:font-heading">
          {title}
        </span>
        <p className="hidden truncate text-[11px] text-muted-foreground leading-tight min-[720px]:block">
          {project.tagline}
        </p>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums min-[720px]:hidden">
          <span className="flex items-center gap-0.5 font-medium text-foreground">
            <RiArrowUpLine className="size-3 text-muted-foreground" />
            {voteCount}
          </span>
          <span aria-hidden="true" className="opacity-50">
            ·
          </span>
          <span>{submittedAt}</span>
        </div>
      </div>

      {/* Vote column — desktop only */}
      <span className="hidden items-center justify-end gap-0.5 font-medium font-mono text-foreground text-xs tabular-nums min-[720px]:flex">
        <RiArrowUpLine className="size-3.5 text-muted-foreground" />
        {voteCount}
      </span>

      {/* Date column — desktop only */}
      <span className="hidden font-mono text-[11px] text-muted-foreground tabular-nums min-[720px]:block">
        {submittedAt}
      </span>

      {/* Actions slot — owner-provided */}
      <div className="flex shrink-0 justify-end gap-1">{actions}</div>
    </div>
  );
}
