import { cn } from "@shared/lib/utils";

const DOT_CLASS: Record<1 | 2 | 3, string> = {
  1: "bg-amber-500 dark:bg-amber-400",
  2: "bg-zinc-400 dark:bg-zinc-400",
  3: "bg-orange-700 dark:bg-orange-400",
};

export interface RankDotProps {
  className?: string;
  /** Rank position (1-based). Only ranks 1–3 render a dot; others return null. */
  rank: number;
}

/**
 * Small colored dot that marks the top-three ranks on the project list.
 * Renders `null` for any rank outside 1–3 so callers can unconditionally
 * drop it into their layout.
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
