"use client";

import type { Cohort } from "@entities/cohort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";

export const ALL_COHORTS = "__all__";

export interface CohortDropdownProps {
  cohorts: Cohort[];
  /** Called with the new cohort id, or null when "All cohorts" is selected. */
  onValueChange: (cohortId: string | null) => void;
  /** The currently selected cohort id, or null for "All cohorts". */
  value: string | null;
}

/**
 * Controlled cohort filter dropdown. State and URL sync are owned by the
 * parent — this component only renders the selection UI and fires callbacks.
 */
export function CohortDropdown({
  cohorts,
  value,
  onValueChange,
}: CohortDropdownProps) {
  const handleChange = (next: string) => {
    onValueChange(next === ALL_COHORTS ? null : next);
  };

  return (
    <Select onValueChange={handleChange} value={value ?? ALL_COHORTS}>
      <SelectTrigger
        aria-label="클래스로 필터"
        className="w-[200px]"
        data-testid="cohort-dropdown"
      >
        <SelectValue placeholder="모든 클래스" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_COHORTS}>모든 클래스</SelectItem>
        {cohorts.map((cohort) => (
          <SelectItem key={cohort.id} value={cohort.id}>
            {cohort.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
