import { COHORT_NAMES } from "./names";
import type { Cohort } from "./schema";

// 인프런 leads the class filter and toycrane trails it, whatever their dates.
// Neither is a class: 인프런 is a track of its own, toycrane is the operator's
// bucket (see `isSelectableCohort`, which keeps it out of the surfaces where a
// user picks a cohort).
//
// The pins live in code because no timestamp can express them. "Always first"
// is not a date — faking one would mean picking a value nobody could read as
// true, and re-picking it every time a newer class arrives.
const PINNED_FIRST: readonly string[] = [COHORT_NAMES.inflearn];
const PINNED_LAST: readonly string[] = [COHORT_NAMES.operator];

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
 * so the newest row is the newest class. This is the only place that order is
 * decided; the query does not sort, because a second copy of the rule could
 * only drift from this one.
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
    // sort lexically. An unparseable value yields NaN, which would make this
    // comparator incoherent and let the sort emit an arbitrary permutation —
    // fall through to the name instead.
    const byDate =
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (byDate !== 0 && !Number.isNaN(byDate)) {
      return byDate;
    }
    // Reached only when two rows share an instant, which means they were
    // written by one statement (`now()` is per transaction). The name says
    // nothing about which class is newer — "LGE-2" sorts above "LGE-3" and
    // "LGE-10" above "LGE-9" — so this is for stability alone. Seed and any
    // batch insert must set `created_at` explicitly rather than lean on it.
    return a.name < b.name ? -1 : Number(a.name > b.name);
  });
}
