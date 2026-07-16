"use client";

import type { Cohort } from "@entities/cohort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";

export const ALL_COHORTS_LABEL = "모든 클래스";

/**
 * Stands in for "no cohort filter". The board models that as `null`, but
 * Radix reserves the empty string internally and rejects it as an item
 * value, so the two representations are mapped at this boundary and `null`
 * never leaks into the DOM.
 */
const ALL_COHORTS_VALUE = "all";

export interface CohortSelectProps {
  /** The "모든 클래스" option's count (total project count). */
  allCount: number;
  /** Rendered in the given order — `fetchCohorts` returns newest class first. */
  cohorts: Cohort[];
  /** Project count per cohort id, used for the per-option count. */
  counts: Record<string, number>;
  /** Called with the cohort id, or `null` for "모든 클래스". */
  onValueChange: (cohortId: string | null) => void;
  /** Currently selected cohort id, or `null` for "모든 클래스". */
  value: string | null;
}

/**
 * Cohort filter for the project board. A dropdown rather than a row of
 * chips because cohorts are an open-ended series — a new class lands every
 * few weeks and none are ever retired — so any layout that gives each
 * cohort its own permanent slot grows without bound. The dropdown's
 * footprint is fixed no matter how many classes exist, and it matches the
 * Select used to *pick* a cohort in onboarding and settings.
 *
 * Controlled — the parent owns the URL sync and the in-memory filter.
 */
export function CohortSelect({
  allCount,
  cohorts,
  counts,
  onValueChange,
  value,
}: CohortSelectProps) {
  // Left to itself, `SelectValue` mirrors the selected item's children — but
  // it can only do that once Radix has registered the items on the client, so
  // the server renders an empty box that fills in on hydration. This page
  // goes out of its way to get first paint right (the board is seeded with
  // the parsed `?cohort` for exactly that reason), so pass the label in as
  // children instead and let it render on the server too.
  const selected = cohorts.find((cohort) => cohort.id === value);
  const selectedLabel = selected?.label ?? ALL_COHORTS_LABEL;
  const selectedCount = selected ? (counts[selected.id] ?? 0) : allCount;

  return (
    <Select
      onValueChange={(next) =>
        onValueChange(next === ALL_COHORTS_VALUE ? null : next)
      }
      value={value ?? ALL_COHORTS_VALUE}
    >
      <SelectTrigger
        aria-label="클래스로 필터"
        className="w-full sm:w-56"
        data-testid="cohort-select-trigger"
      >
        <SelectValue>
          <CohortOptionLabel count={selectedCount} label={selectedLabel} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent data-testid="cohort-select-content">
        <SelectItem value={ALL_COHORTS_VALUE}>
          <CohortOptionLabel count={allCount} label={ALL_COHORTS_LABEL} />
        </SelectItem>
        {cohorts.map((cohort) => (
          <SelectItem key={cohort.id} value={cohort.id}>
            <CohortOptionLabel
              count={counts[cohort.id] ?? 0}
              label={cohort.label}
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Radix mirrors the selected item's children into the trigger, so this one
 * node renders both places and the count follows the selection for free.
 */
function CohortOptionLabel({ count, label }: { count: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span>{label}</span>
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </span>
  );
}
