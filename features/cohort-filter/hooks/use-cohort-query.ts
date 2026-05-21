"use client";

import { useQueryState } from "nuqs";
import { cohortParser } from "../search-params";

export function useCohortQuery() {
  return useQueryState(
    "cohort",
    cohortParser.withOptions({ history: "push", shallow: true })
  );
}
