/**
 * Cohorts that are not classes, and therefore carry rules of their own.
 *
 * Both rules match on `name` — the stable slug that tests, URLs, and
 * server-side lookups use — never on `label`, which is display copy and may
 * change. Naming them once keeps the two rules from drifting apart: renaming a
 * slug in only one place would leave the codebase compiling and every test
 * green while half the behaviour silently changed.
 */
export const COHORT_NAMES = {
  /** Operator-only bucket. Not selectable (see `isSelectableCohort`), pinned last (see `sortCohortsForDisplay`). */
  operator: "TOYCRANE",
  /** A track of its own rather than a numbered class. Pinned first. */
  inflearn: "Inflearn",
} as const;
