import { describe, expect, it } from "vitest";
import { sortCohortsForDisplay } from "./order";

const cohort = (name: string, display_order: number) => ({
  name,
  display_order,
});

const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe("sortCohortsForDisplay", () => {
  it("puts the newest class first", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-1", 1),
      cohort("LGE-3", 3),
      cohort("LGE-2", 2),
    ]);

    expect(names(sorted)).toEqual(["LGE-3", "LGE-2", "LGE-1"]);
  });

  it("keeps 인프런 at the top even when a class holds a higher order", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-7", 7),
      cohort("Inflearn", 1),
    ]);

    expect(names(sorted)).toEqual(["Inflearn", "LGE-7"]);
  });

  it("keeps toycrane at the bottom even when it holds the highest order", () => {
    const sorted = sortCohortsForDisplay([
      cohort("TOYCRANE", 99),
      cohort("LGE-1", 1),
    ]);

    expect(names(sorted)).toEqual(["LGE-1", "TOYCRANE"]);
  });

  it("pins both ends at once and leaves the classes newest first between them", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-1", 1),
      cohort("TOYCRANE", 5),
      cohort("Inflearn", 4),
      cohort("LGE-3", 3),
      cohort("LGE-2", 2),
    ]);

    expect(names(sorted)).toEqual([
      "Inflearn",
      "LGE-3",
      "LGE-2",
      "LGE-1",
      "TOYCRANE",
    ]);
  });

  it("sorts a class added without an explicit order above every existing one", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-7", 7),
      cohort("LGE-8", 8),
      cohort("Inflearn", 4),
    ]);

    expect(names(sorted)).toEqual(["Inflearn", "LGE-8", "LGE-7"]);
  });

  it("falls back to the name when two cohorts share an order", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-4", 3),
      cohort("LGE-3", 3),
    ]);

    expect(names(sorted)).toEqual(["LGE-3", "LGE-4"]);
  });

  it("matches by the machine name, so a lowercase toycrane is not pinned", () => {
    const sorted = sortCohortsForDisplay([
      cohort("toycrane", 9),
      cohort("LGE-1", 1),
    ]);

    expect(names(sorted)).toEqual(["toycrane", "LGE-1"]);
  });

  it("leaves the caller's array untouched", () => {
    const rows = [cohort("LGE-1", 1), cohort("LGE-2", 2)];

    sortCohortsForDisplay(rows);

    expect(names(rows)).toEqual(["LGE-1", "LGE-2"]);
  });
});
