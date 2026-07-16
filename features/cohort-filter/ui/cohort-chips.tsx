"use client";

import type { Cohort } from "@entities/cohort";
import { cn } from "@shared/lib/utils";
import { useEffect, useRef } from "react";
import { ALL_COHORTS_LABEL } from "../labels";

/** Width of the right-edge fade, in px. A chip ending under it reads as cut off. */
const FADE_WIDTH = 40;
/** Breathing room left of a chip scrolled into view. */
const SCROLL_GUTTER = 12;

const CHIP_BASE =
  "inline-flex flex-none items-center gap-1.5 rounded-none border px-2.5 py-1 font-mono font-medium text-[11px] transition-[color,background-color,border-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap";
const CHIP_IDLE = "border-border bg-background text-foreground hover:bg-muted";
const CHIP_SELECTED =
  "border-foreground bg-foreground text-background hover:bg-foreground";

export interface CohortChipsProps {
  /** The "All" chip's count (total project count). */
  allCount: number;
  className?: string;
  cohorts: Cohort[];
  /** Project count per cohort id, used for the per-chip badge. */
  counts: Record<string, number>;
  /** Called with the cohort id, or `null` for the "모든 클래스" chip. */
  onValueChange: (cohortId: string | null) => void;
  /** Currently selected cohort id, or `null` for "모든 클래스". */
  value: string | null;
}

/**
 * Single-line rail of square-cornered chips — the class filter below 720px,
 * where the desktop combobox is hidden. Controlled: the parent owns the URL
 * sync and in-memory filter.
 *
 * The rail scrolls horizontally rather than wrapping, so the board header
 * stays one row tall however many classes exist; a right-edge fade signals
 * there is more to scroll to.
 */
export function CohortChips({
  allCount,
  className,
  cohorts,
  counts,
  onValueChange,
  value,
}: CohortChipsProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const isAllSelected = value === null;

  // A cohort arriving from the URL (deep link) may sit off-screen in the rail.
  // Nudge the rail's own scrollLeft — `scrollIntoView` would also scroll the
  // page vertically, jumping the reader past the heading.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || value === null) {
      return;
    }
    if (rail.scrollWidth <= rail.clientWidth) {
      return;
    }
    const chip = rail.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!chip) {
      return;
    }
    const railBox = rail.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    const hiddenRight = chipBox.right > railBox.right - FADE_WIDTH;
    const hiddenLeft = chipBox.left < railBox.left;
    if (hiddenRight || hiddenLeft) {
      rail.scrollLeft += chipBox.left - railBox.left - SCROLL_GUTTER;
    }
  }, [value]);

  return (
    <nav
      aria-label="클래스로 필터"
      className={cn("relative", className)}
      data-testid="cohort-chips"
    >
      <div
        className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pr-10"
        ref={railRef}
      >
        <Chip
          count={allCount}
          label={ALL_COHORTS_LABEL}
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
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-r from-transparent to-background"
      />
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
