import type { Cohort } from "./schema";

// 인프런 leads the class filter and toycrane trails it, whatever `display_order`
// they happen to hold. Neither is a class: 인프런 is a track of its own, toycrane
// is the operator's bucket (see `isSelectableCohort`, which keeps it out of the
// surfaces where a user picks a cohort).
//
// The pins live here rather than as reserved `display_order` values because the
// alternative charges the wrong person. Encoding them as numbers — 인프런 100,
// toycrane 0 — means everyone adding a class has to know which numbers are
// spoken for, and a forgotten value lands the new class at the bottom silently.
// These two exceptions do not grow; classes are added every month or so. The
// exceptions should carry the cost, not the routine case.
//
// Matched on `name` (the stable slug), never on `label`.
const PINNED_FIRST: readonly string[] = ["Inflearn"];
const PINNED_LAST: readonly string[] = ["TOYCRANE"];

type Orderable = Pick<Cohort, "name" | "display_order">;

/** -1 pins to the top, 1 to the bottom, 0 takes its place among the classes. */
function pinRank(name: string): number {
  if (PINNED_FIRST.includes(name)) {
    return -1;
  }
  return PINNED_LAST.includes(name) ? 1 : 0;
}

/**
 * Display order for the class filter: pinned names at the ends, every class
 * between them newest first.
 *
 * `display_order` is an identity column, so it rises with each insert and
 * descending reads as newest-first. `name` breaks ties, which only arise when
 * a value was set explicitly to override insert order.
 *
 * This repeats the `order by` in `fetchCohorts` on purpose — the result is
 * correct for any input order, so no caller has to have sorted first.
 */
export function sortCohortsForDisplay<T extends Orderable>(
  cohorts: readonly T[]
): T[] {
  return [...cohorts].sort((a, b) => {
    const byPin = pinRank(a.name) - pinRank(b.name);
    if (byPin !== 0) {
      return byPin;
    }
    const byOrder = b.display_order - a.display_order;
    if (byOrder !== 0) {
      return byOrder;
    }
    return a.name < b.name ? -1 : Number(a.name > b.name);
  });
}
