import { describe, expect, it } from "vitest";
import { sortCohortsForDisplay } from "./order";

const cohort = (name: string, created_at: string) => ({ name, created_at });

const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe("sortCohortsForDisplay", () => {
  it("puts the newest class first", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-1", "2026-04-14T06:00:50Z"),
      cohort("LGE-3", "2026-04-14T06:00:54Z"),
      cohort("LGE-2", "2026-04-14T06:00:52Z"),
    ]);

    expect(names(sorted)).toEqual(["LGE-3", "LGE-2", "LGE-1"]);
  });

  it("keeps 인프런 at the top even when a class is newer", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-7", "2026-07-16T00:00:00Z"),
      cohort("Inflearn", "2026-01-01T00:00:00Z"),
    ]);

    expect(names(sorted)).toEqual(["Inflearn", "LGE-7"]);
  });

  it("keeps toycrane at the bottom even when it is the newest row", () => {
    const sorted = sortCohortsForDisplay([
      cohort("TOYCRANE", "2027-01-01T00:00:00Z"),
      cohort("LGE-1", "2026-04-14T06:00:50Z"),
    ]);

    expect(names(sorted)).toEqual(["LGE-1", "TOYCRANE"]);
  });

  it("pins both ends at once and leaves the classes newest first between them", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-1", "2026-04-14T06:00:50Z"),
      cohort("TOYCRANE", "2026-07-06T05:59:13Z"),
      cohort("Inflearn", "2026-05-01T00:00:00Z"),
      cohort("LGE-3", "2026-04-14T06:00:54Z"),
      cohort("LGE-2", "2026-04-14T06:00:52Z"),
    ]);

    expect(names(sorted)).toEqual([
      "Inflearn",
      "LGE-3",
      "LGE-2",
      "LGE-1",
      "TOYCRANE",
    ]);
  });

  it("sorts a newly added class above every existing one", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-7", "2026-07-16T06:12:14Z"),
      cohort("LGE-8", "2026-09-01T09:30:00Z"),
      cohort("Inflearn", "2026-05-01T00:00:00Z"),
    ]);

    expect(names(sorted)).toEqual(["Inflearn", "LGE-8", "LGE-7"]);
  });

  it("compares instants, not strings, so a +09:00 offset still sorts correctly", () => {
    // 2026-04-14T15:00:00+09:00 is 06:00:00Z — earlier than 06:00:52Z, even
    // though it sorts later as plain text.
    const sorted = sortCohortsForDisplay([
      cohort("LGE-1", "2026-04-14T15:00:00+09:00"),
      cohort("LGE-2", "2026-04-14T06:00:52Z"),
    ]);

    expect(names(sorted)).toEqual(["LGE-2", "LGE-1"]);
  });

  it("falls back to the name when two rows share a timestamp", () => {
    const sorted = sortCohortsForDisplay([
      cohort("LGE-4", "2026-04-14T06:00:52Z"),
      cohort("LGE-3", "2026-04-14T06:00:52Z"),
    ]);

    expect(names(sorted)).toEqual(["LGE-3", "LGE-4"]);
  });

  it("matches by the machine name, so a lowercase toycrane is not pinned", () => {
    const sorted = sortCohortsForDisplay([
      cohort("toycrane", "2027-01-01T00:00:00Z"),
      cohort("LGE-1", "2026-04-14T06:00:50Z"),
    ]);

    expect(names(sorted)).toEqual(["toycrane", "LGE-1"]);
  });

  it("leaves the caller's array untouched", () => {
    const rows = [
      cohort("LGE-1", "2026-04-14T06:00:50Z"),
      cohort("LGE-2", "2026-04-14T06:00:52Z"),
    ];

    sortCohortsForDisplay(rows);

    expect(names(rows)).toEqual(["LGE-1", "LGE-2"]);
  });
});
