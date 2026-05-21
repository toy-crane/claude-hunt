import { parseAsString } from "nuqs/server";

export const cohortParser = parseAsString;
export const cohortSearchParams = { cohort: cohortParser };
