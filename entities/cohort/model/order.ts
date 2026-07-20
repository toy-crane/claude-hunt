import type { Cohort } from "./schema";

// 인프런 leads the class filter and toycrane trails it, whatever their dates.
// Neither is a class: 인프런 is a track of its own, toycrane is the operator's
// bucket (see `isSelectableCohort`, which keeps it out of the surfaces where a
// user picks a cohort).
//
// The pins live in code because no timestamp can express them. "Always first"
// is not a date — faking one would mean picking a value nobody could read as
// true, and re-picking it every time a newer class arrives.
//
// Matched on `name` (the stable slug), never on `label`.
const PINNED_FIRST: readonly string[] = ["Inflearn"];
const PINNED_LAST: readonly string[] = ["TOYCRANE"];

type Orderable = Pick<Cohort, "name" | "created_at">;

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
 * `created_at` is the sort key — a class row is written when the class opens,
 * so the newest row is the newest class. Two rows written by one statement
 * share a timestamp (`now()` is per transaction), so `name` breaks ties to keep
 * the order stable; seed and migrations set the column explicitly to avoid
 * relying on that.
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
    // Parsed rather than string-compared: PostgREST renders timestamptz with an
    // offset, and two spellings of the same instant ("…Z" vs "…+00:00") do not
    // sort lexically.
    const byDate =
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (byDate !== 0) {
      return byDate;
    }
    return a.name < b.name ? -1 : Number(a.name > b.name);
  });
}
