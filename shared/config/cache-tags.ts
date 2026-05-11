/**
 * Tags used by `unstable_cache` Data Cache entries and `revalidateTag`
 * mutation invalidations. Adding a tag here is a contract between the
 * function that emits the cache entry and every action that should bust
 * it.
 */
export const CACHE_TAGS = {
  /**
   * Landing-page grid rows (`projects_with_vote_count` plus screenshot
   * URLs). Bust on any project insert/update/delete, any vote toggle,
   * and any profile update that changes display name or avatar (the
   * view joins through the author profile).
   */
  PROJECTS_GRID: "projects-grid",
  /**
   * Cohort list shared by the dropdown and chips. Bust when an admin
   * adds, renames, or removes a cohort.
   */
  COHORTS: "cohorts",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
