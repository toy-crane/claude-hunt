import { describe, expect, it } from "vitest";
import { monthBoundsUtc, monthLabel, monthSlug } from "./month";

describe("monthSlug", () => {
  it("uses the KST calendar month, not UTC", () => {
    // 2026-05-31T16:00:00Z is 2026-06-01 01:00 KST → June, not May.
    expect(monthSlug(new Date("2026-05-31T16:00:00Z"))).toBe("2026-06");
    // 2026-06-01T02:00:00Z is still 2026-06-01 11:00 KST → June.
    expect(monthSlug(new Date("2026-06-01T02:00:00Z"))).toBe("2026-06");
  });

  it("honors an explicit timezone override", () => {
    expect(monthSlug(new Date("2026-05-31T16:00:00Z"), "UTC")).toBe("2026-05");
  });
});

describe("monthLabel", () => {
  it("renders the Korean label from the KST month", () => {
    expect(monthLabel(new Date("2026-05-31T16:00:00Z"))).toBe("2026년 6월");
    expect(monthLabel(new Date("2026-12-31T20:00:00Z"))).toBe("2027년 1월");
  });
});

describe("monthBoundsUtc", () => {
  it("returns the KST month start/end projected onto UTC instants", () => {
    // June 2026 in KST starts 2026-06-01 00:00 KST = 2026-05-31 15:00 UTC
    // and ends 2026-07-01 00:00 KST = 2026-06-30 15:00 UTC.
    const { startUtc, endUtc } = monthBoundsUtc(
      new Date("2026-06-15T12:00:00Z")
    );
    expect(startUtc).toBe("2026-05-31T15:00:00.000Z");
    expect(endUtc).toBe("2026-06-30T15:00:00.000Z");
  });

  it("buckets a late-UTC-evening KST submission into the next month", () => {
    // A row created 2026-05-31T16:00:00Z (KST June 1) must fall inside the
    // June bounds and outside the May bounds.
    const created = "2026-05-31T16:00:00Z";
    const june = monthBoundsUtc(new Date("2026-06-15T00:00:00Z"));
    expect(created >= june.startUtc && created < june.endUtc).toBe(true);

    const may = monthBoundsUtc(new Date("2026-05-15T00:00:00Z"));
    expect(created >= may.startUtc && created < may.endUtc).toBe(false);
  });
});
