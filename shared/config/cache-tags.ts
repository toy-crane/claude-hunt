/**
 * Tags applied to `use cache` entries via `cacheTag()` and busted by
 * `updateTag()` in server actions. Adding a tag here is a contract between
 * the cached function that emits the entry and every action that should
 * bust it.
 */
export const CACHE_TAGS = {
  /**
   * Landing-page grid rows (`projects_with_vote_count` plus screenshot
   * URLs), the monthly spotlight, the header project count, and the
   * project-detail core. Bust on any project insert/update/delete, any
   * vote toggle, and any profile update that changes display name or
   * avatar (the view joins through the author profile).
   */
  PROJECTS: "projects",
  /**
   * Cohort list shared by the dropdown and chips. Cohorts are managed
   * outside the app (seed / migrations), so nothing currently calls
   * `updateTag(COHORTS)`; the `cacheLife` window surfaces changes within
   * ~1 minute. Wire a buster here if in-app cohort management is added.
   */
  COHORTS: "cohorts",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
