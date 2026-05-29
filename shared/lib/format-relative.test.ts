import { describe, expect, it } from "vitest";
import {
  daysSince,
  formatRelativeKo,
  formatRelativeShort,
} from "./format-relative";

const NOW = new Date("2026-05-10T00:00:00Z");

describe("formatRelativeKo", () => {
  it("returns empty string for null / unparseable input", () => {
    expect(formatRelativeKo(null)).toBe("");
    expect(formatRelativeKo("not-a-date")).toBe("");
  });
});

describe("formatRelativeShort", () => {
  it("returns empty string for null / unparseable input", () => {
    expect(formatRelativeShort(null)).toBe("");
  });
});

describe("daysSince", () => {
  it("returns the floored day difference, never negative", () => {
    expect(daysSince("2026-05-08T00:00:00Z", NOW)).toBe(2);
    expect(daysSince("2026-05-09T23:00:00Z", NOW)).toBe(0);
    // Future timestamps clamp to zero rather than going negative.
    expect(daysSince("2026-05-20T00:00:00Z", NOW)).toBe(0);
  });
});
