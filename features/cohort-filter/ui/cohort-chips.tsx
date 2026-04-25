"use client";

import type { Cohort } from "@entities/cohort";
import { cn } from "@shared/lib/utils";

export const ALL_COHORTS_CHIP_LABEL = "모든 클래스";

const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 font-mono font-medium text-[11px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap";
const CHIP_IDLE = "border-border bg-background text-foreground hover:bg-muted";
const CHIP_SELECTED =
  "border-foreground bg-foreground text-background hover:bg-foreground";

export interface CohortChipsProps {
  /** The "All" chip's count (total project count). */
  allCount: number;
  cohorts: Cohort[];
  /** Project count per cohort id, used for the per-chip badge. */
  counts: Record<string, number>;
  /** Called with the cohort id, or `null` for the "모든 클래스" chip. */
  onValueChange: (cohortId: string | null) => void;
  /** Currently selected cohort id, or `null` for "모든 클래스". */
  value: string | null;
}

/**
 * Horizontal row of square-cornered chips replacing the legacy dropdown
 * on the landing page. Controlled — the parent owns the URL sync and
 * in-memory filter.
 */
export function CohortChips({
  allCount,
  cohorts,
  counts,
  onValueChange,
  value,
}: CohortChipsProps) {
  const isAllSelected = value === null;
  return (
    <nav
      aria-label="클래스로 필터"
      className="flex flex-wrap items-center gap-1.5"
      data-testid="cohort-chips"
    >
      <Chip
        count={allCount}
        label={ALL_COHORTS_CHIP_LABEL}
        onClick={() => onValueChange(null)}
        selected={isAllSelected}
      />
      {cohorts.map((cohort) => {
        const selected = value === cohort.id;
        return (
          <Chip
            count={counts[cohort.id] ?? 0}
            key={cohort.id}
            label={cohort.label}
            onClick={() => onValueChange(cohort.id)}
            selected={selected}
          />
        );
      })}
    </nav>
  );
}

interface ChipProps {
  count: number;
  label: string;
  onClick: () => void;
  selected: boolean;
}

function Chip({ count, label, onClick, selected }: ChipProps) {
  return (
    <button
      aria-pressed={selected}
      className={cn(CHIP_BASE, selected ? CHIP_SELECTED : CHIP_IDLE)}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span className="tabular-nums opacity-60">{count}</span>
    </button>
  );
}
