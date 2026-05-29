import { describe, expect, it } from "vitest";
import { formatRelativeKo } from "./format-relative";

const NOW = new Date("2026-05-10T00:00:00Z");

describe("formatRelativeKo", () => {
  it("returns empty string for null / unparseable input", () => {
    expect(formatRelativeKo(null)).toBe("");
    expect(formatRelativeKo("not-a-date")).toBe("");
  });

  it("renders '방금 전' for under a minute", () => {
    expect(formatRelativeKo("2026-05-09T23:59:30Z", NOW)).toBe("방금 전");
  });

  it("renders minutes for under an hour", () => {
    expect(formatRelativeKo("2026-05-09T23:30:00Z", NOW)).toBe("30분 전");
  });

  it("renders hours for under a day", () => {
    expect(formatRelativeKo("2026-05-09T21:00:00Z", NOW)).toBe("3시간 전");
  });

  it("renders days within the relative window", () => {
    expect(formatRelativeKo("2026-05-08T00:00:00Z", NOW)).toBe("2일 전");
  });

  it("clamps future timestamps to '방금 전'", () => {
    expect(formatRelativeKo("2026-05-20T00:00:00Z", NOW)).toBe("방금 전");
  });

  it("still uses relative form at the 30-day boundary", () => {
    // Exactly 30 days before NOW.
    expect(formatRelativeKo("2026-04-10T00:00:00Z", NOW)).toBe("30일 전");
  });

  it("switches to an absolute same-year date past 30 days", () => {
    // 31 days before NOW → absolute, same calendar year → "M월 D일" (KST).
    expect(formatRelativeKo("2026-04-09T00:00:00Z", NOW)).toBe("4월 9일");
  });

  it("includes the year for an absolute date in a prior year", () => {
    expect(formatRelativeKo("2025-12-25T00:00:00Z", NOW)).toBe(
      "2025년 12월 25일"
    );
  });

  it("projects the absolute date into Asia/Seoul", () => {
    // 2026-03-31T20:00Z is 2026-04-01 05:00 KST — the KST date wins.
    expect(formatRelativeKo("2026-03-31T20:00:00Z", NOW)).toBe("4월 1일");
  });
});
