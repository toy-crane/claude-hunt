import { Badge } from "@shared/ui/badge";

const RANK: Record<1 | 2 | 3, { label: string; dotClass: string }> = {
  1: { label: "1st", dotClass: "bg-amber-500" },
  2: { label: "2nd", dotClass: "bg-zinc-400" },
  3: { label: "3rd", dotClass: "bg-orange-700" },
};

export interface RankBadgeProps {
  className?: string;
  rank: number;
}

export function RankBadge({ rank, className }: RankBadgeProps) {
  if (rank < 1 || rank > 3) {
    return null;
  }
  const { label, dotClass } = RANK[rank as 1 | 2 | 3];
  return (
    <Badge className={className} variant="secondary">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${dotClass}`}
        data-testid="rank-dot"
      />
      {label}
    </Badge>
  );
}
