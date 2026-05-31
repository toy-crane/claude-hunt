/**
 * Cache tag factory for `'use cache'` entries (`cacheTag`) and mutation
 * invalidations (`updateTag` / `revalidateTag`). Each function returns the
 * tag string that forms the contract between the cached read that emits it
 * and every action that should bust it.
 *
 * Naming follows the `entity` / `entity:id` convention so a coarse tag busts
 * a whole collection while a fine tag busts a single entity:
 *   - `projects()`    → the landing grid, project count, and monthly
 *                       spotlight collection. Bust on any project
 *                       insert/delete, any vote, or an author-profile change
 *                       that the grid joins through.
 *   - `project(id)`   → one project's detail + comments + reactions. Bust on
 *                       that project's vote/comment/reaction/edit.
 *   - `cohorts()`     → the cohort reference list.
 */
export const cacheTags = {
  projects: () => "projects",
  project: (id: string) => `project:id:${id}`,
  cohorts: () => "cohorts",
} as const;
