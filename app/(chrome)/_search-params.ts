import { cohortSearchParams } from "@features/cohort-filter/server";
import { createSearchParamsCache } from "nuqs/server";

export const projectsSearchParams = {
  ...cohortSearchParams,
};

export const projectsSearchParamsCache =
  createSearchParamsCache(projectsSearchParams);
