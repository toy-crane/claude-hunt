import { cn } from "@shared/lib/utils";

const RANK_LABEL: Record<1 | 2 | 3, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

export interface RankBadgeProps {
  className?: string;
  rank: number;
}

/**
 * Renders a neutral "1st" / "2nd" / "3rd" pill for the top three grid
 * slots. Uses only semantic tokens so dark mode and theme overrides
 * propagate automatically. Returns null for any rank outside 1–3 so the
 * caller can blindly pass the index without guarding.
 */
export function RankBadge({ rank, className }: RankBadgeProps) {
  if (rank < 1 || rank > 3) {
    return null;
  }
  const key = rank as 1 | 2 | 3;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground text-xs",
        className
      )}
    >
      {RANK_LABEL[key]}
    </span>
  );
}
