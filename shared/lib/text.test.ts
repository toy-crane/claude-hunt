import { describe, expect, it } from "vitest";
import { blankToUndefined, flattenToSingleLine } from "./text";

describe("blankToUndefined", () => {
  it("returns undefined for an empty string", () => {
    expect(blankToUndefined("")).toBeUndefined();
  });

  it("returns undefined for a whitespace-only string", () => {
    expect(blankToUndefined("   \n  ")).toBeUndefined();
  });

  it("returns the trimmed value when non-empty", () => {
    expect(blankToUndefined("  hello  ")).toBe("hello");
  });
});

describe("flattenToSingleLine", () => {
  it("collapses a newline into a single space", () => {
    expect(flattenToSingleLine("첫 줄\n둘째 줄")).toBe("첫 줄 둘째 줄");
  });

  it("collapses blank lines and surrounding whitespace", () => {
    expect(flattenToSingleLine("a \n\n  b")).toBe("a b");
  });

  it("trims the result and leaves single-line input untouched", () => {
    expect(flattenToSingleLine("  already one line  ")).toBe(
      "already one line"
    );
  });
});
