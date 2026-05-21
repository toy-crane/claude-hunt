import { parseAsString } from "nuqs/server";

export const cohortParser = parseAsString;
export const cohortQueryOptions = cohortParser.withOptions({
  history: "push",
  shallow: true,
});
export const cohortSearchParams = { cohort: cohortParser };
