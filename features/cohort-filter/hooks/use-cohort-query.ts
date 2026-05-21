"use client";

import { useQueryState } from "nuqs";
import { cohortQueryOptions } from "../search-params";

export function useCohortQuery() {
  return useQueryState("cohort", cohortQueryOptions);
}
