import { cn } from "@shared/lib/utils";

const DOT_CLASS: Record<1 | 2 | 3, string> = {
  1: "bg-[var(--term-rank-1,#f59e0b)]",
  2: "bg-[var(--term-rank-2,#71717a)]",
  3: "bg-[var(--term-rank-3,#c2410c)]",
};

export interface RankDotProps {
  className?: string;
  /** Rank position (1-based). Only ranks 1–3 render a dot; others return null. */
  rank: number;
}

/**
 * Small colored dot that marks the top-three ranks on the project list.
 * Colors bind to the app-level `--term-rank-1/2/3` CSS variables
 * declared in `app/globals.css`; the arbitrary hex fallbacks keep the
 * dot visible if rendered before the stylesheet loads.
 */
export function RankDot({ rank, className }: RankDotProps) {
  if (rank < 1 || rank > 3) {
    return null;
  }
  const colorClass = DOT_CLASS[rank as 1 | 2 | 3];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-1.5 rounded-full",
        colorClass,
        className
      )}
      data-rank={rank}
      data-testid="rank-dot"
    />
  );
}
