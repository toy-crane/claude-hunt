import { cn } from "@shared/lib/utils.ts";

const RANK_LABEL: Record<1 | 2 | 3, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

const RANK_STYLE: Record<1 | 2 | 3, string> = {
  1: "bg-yellow-400/90 text-yellow-950",
  2: "bg-zinc-300 text-zinc-900",
  3: "bg-orange-300 text-orange-950",
};

export interface RankBadgeProps {
  className?: string;
  rank: number;
}

/**
 * Renders a "1st" / "2nd" / "3rd" pill for the top three grid slots.
 * Returns null for any rank outside 1–3 so the caller can blindly pass
 * the index without guarding.
 */
export function RankBadge({ rank, className }: RankBadgeProps) {
  if (rank < 1 || rank > 3) {
    return null;
  }
  const key = rank as 1 | 2 | 3;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5 font-semibold text-xs",
        RANK_STYLE[key],
        className
      )}
    >
      {RANK_LABEL[key]}
    </span>
  );
}
