"use client";

import type { Cohort } from "@entities/cohort";
import { RiArrowDownSLine } from "@remixicon/react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/popover";
import { useState } from "react";
import { ALL_COHORTS_LABEL } from "../labels";

const TRIGGER_CLASS =
  "inline-flex items-center gap-1 rounded-none border border-border bg-background px-2.5 py-[5px] font-mono font-medium text-[11px] text-foreground transition-colors duration-150 hover:bg-muted active:translate-y-px outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap";

export interface CohortComboboxProps {
  /** The "모든 클래스" option's count (total project count). */
  allCount: number;
  cohorts: Cohort[];
  /** Project count per cohort id, used for the per-option badge. */
  counts: Record<string, number>;
  /** Called with the cohort id, or `null` for "모든 클래스". */
  onValueChange: (cohortId: string | null) => void;
  /** Currently selected cohort id, or `null` for "모든 클래스". */
  value: string | null;
}

/**
 * Searchable class filter for the desktop toolbar. Controlled — the parent
 * owns the URL sync and in-memory filter, same contract as `CohortChips`.
 *
 * cmdk's own filtering is disabled: it re-ranks items by fuzzy score, and the
 * cohort list has a deliberate server-side order (name ascending) to preserve.
 * A plain substring match keeps that order and matches how the class names
 * actually read.
 */
export function CohortCombobox({
  allCount,
  cohorts,
  counts,
  onValueChange,
  value,
}: CohortComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? cohorts.filter((cohort) => cohort.label.toLowerCase().includes(needle))
    : cohorts;

  const selectedLabel =
    cohorts.find((cohort) => cohort.id === value)?.label ?? ALL_COHORTS_LABEL;

  const select = (cohortId: string | null) => {
    onValueChange(cohortId);
    setOpen(false);
  };

  return (
    <Popover
      onOpenChange={(next) => {
        // Reset on open rather than on close: clearing while the close
        // animation still runs would show the full list flashing back in.
        if (next) {
          setQuery("");
        }
        setOpen(next);
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <button
          // Radix also supplies these via asChild; stating them keeps the
          // combobox role complete on its own terms.
          aria-expanded={open}
          className={TRIGGER_CLASS}
          data-testid="cohort-combobox-trigger"
          role="combobox"
          type="button"
        >
          <span className="text-muted-foreground">클래스:</span>
          {selectedLabel}
          <RiArrowDownSLine className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-65 p-0" sideOffset={6}>
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder="클래스 검색…"
            value={query}
          />
          <CommandList className="max-h-50">
            <CommandGroup>
              <CommandItem
                data-checked={value === null}
                onSelect={() => select(null)}
                value="__all__"
              >
                <span className="flex-1 truncate">{ALL_COHORTS_LABEL}</span>
                <span className="text-muted-foreground tabular-nums">
                  {allCount}
                </span>
              </CommandItem>
              {matches.map((cohort) => (
                <CommandItem
                  data-checked={value === cohort.id}
                  key={cohort.id}
                  onSelect={() => select(cohort.id)}
                  value={cohort.id}
                >
                  <span className="flex-1 truncate">{cohort.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {counts[cohort.id] ?? 0}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {/* Not `CommandEmpty`: that keys off cmdk's own filter, which is
                disabled here, and "모든 클래스" always renders — so cmdk never
                sees an empty list even when the search matches no class. */}
            {needle && matches.length === 0 ? (
              <p className="px-3 py-2 text-muted-foreground text-sm">
                찾는 클래스가 없어요.
              </p>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
