import { describe, expect, it } from "vitest";
import { formatDateYmd } from "./format-date";

describe("formatDateYmd", () => {
  it("returns empty string for null / undefined / empty input", () => {
    expect(formatDateYmd(null)).toBe("");
    expect(formatDateYmd(undefined)).toBe("");
    expect(formatDateYmd("")).toBe("");
  });

  it("returns empty string for unparseable input", () => {
    expect(formatDateYmd("not-a-date")).toBe("");
  });

  it("formats UTC midnight as the same day in KST default", () => {
    expect(formatDateYmd("2026-04-12T00:00:00Z")).toBe("2026-04-12");
  });

  it("rolls a KST early-morning submission to the correct KST date (not the UTC day)", () => {
    // 2026-04-12T08:00:00+09:00 → stored as 2026-04-11T23:00:00Z. The
    // previous slice(0,10) bug returned "2026-04-11"; the formatter
    // must return the local KST day instead.
    expect(formatDateYmd("2026-04-11T23:00:00Z")).toBe("2026-04-12");
  });

  it("respects an explicit timeZone override", () => {
    // Same UTC instant, different TZs → different local dates.
    expect(formatDateYmd("2026-04-11T23:00:00Z", { timeZone: "UTC" })).toBe(
      "2026-04-11"
    );
    expect(
      formatDateYmd("2026-04-11T23:00:00Z", { timeZone: "America/New_York" })
    ).toBe("2026-04-11");
  });
});
