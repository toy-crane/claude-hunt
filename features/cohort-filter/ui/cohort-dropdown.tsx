"use client";

import type { Cohort } from "@entities/cohort/index.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select.tsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const ALL_COHORTS = "__all__";

export interface CohortDropdownProps {
  cohorts: Cohort[];
  selectedCohortId: string | null;
}

/**
 * Client-side cohort filter. Reads/writes the `cohort` URL search param
 * so the filter state is shareable and survives reloads. The "All
 * cohorts" option clears the param entirely (natural default).
 */
export function CohortDropdown({
  cohorts,
  selectedCohortId,
}: CohortDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === ALL_COHORTS) {
      params.delete("cohort");
    } else {
      params.set("cohort", next);
    }
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href);
    });
  };

  return (
    <Select
      disabled={isPending}
      onValueChange={handleChange}
      value={selectedCohortId ?? ALL_COHORTS}
    >
      <SelectTrigger
        aria-label="Filter by cohort"
        className="w-[200px]"
        data-testid="cohort-dropdown"
      >
        <SelectValue placeholder="All cohorts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_COHORTS}>All cohorts</SelectItem>
        {cohorts.map((cohort) => (
          <SelectItem key={cohort.id} value={cohort.id}>
            {cohort.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
