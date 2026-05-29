import { describe, expect, it } from "vitest";
import {
  currentMonthLabel,
  currentMonthSlug,
  monthLabelFromDate,
  monthSlugFromDate,
} from "./format";

describe("monthSlugFromDate", () => {
  it("formats year and zero-padded month from UTC", () => {
    expect(monthSlugFromDate(new Date("2026-05-01T00:00:00Z"))).toBe("2026-05");
    expect(monthSlugFromDate(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01");
  });

  it("uses UTC fields, not local time", () => {
    // 2026-06-01 00:30 UTC is still 2026-06 even if local is some other zone.
    expect(monthSlugFromDate(new Date("2026-06-01T00:30:00Z"))).toBe("2026-06");
  });
});

describe("monthLabelFromDate", () => {
  it("renders the Korean month label from UTC fields", () => {
    expect(monthLabelFromDate(new Date("2026-05-01T00:00:00Z"))).toBe(
      "2026년 5월"
    );
    expect(monthLabelFromDate(new Date("2026-12-31T23:59:59Z"))).toBe(
      "2026년 12월"
    );
  });
});

describe("currentMonthSlug / currentMonthLabel", () => {
  it("delegate to the from-date helpers when called with an explicit now", () => {
    const now = new Date("2026-05-15T10:00:00Z");
    expect(currentMonthSlug(now)).toBe(monthSlugFromDate(now));
    expect(currentMonthLabel(now)).toBe(monthLabelFromDate(now));
  });
});
