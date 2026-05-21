import { cohortSearchParams } from "@features/cohort-filter/server";
import { createSearchParamsCache } from "nuqs/server";

export const homeSearchParams = {
  ...cohortSearchParams,
};

export const homeSearchParamsCache = createSearchParamsCache(homeSearchParams);
