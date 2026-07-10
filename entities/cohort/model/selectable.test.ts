import { describe, expect, it } from "vitest";
import { isSelectableCohort } from "./selectable";

describe("isSelectableCohort", () => {
  it("rejects the operator-only TOYCRANE cohort", () => {
    expect(isSelectableCohort({ name: "TOYCRANE" })).toBe(false);
  });

  it("accepts regular cohorts", () => {
    expect(isSelectableCohort({ name: "LGE-1" })).toBe(true);
    expect(isSelectableCohort({ name: "Inflearn" })).toBe(true);
  });

  it("matches by the machine name, not the display label (lowercase toycrane stays selectable)", () => {
    expect(isSelectableCohort({ name: "toycrane" })).toBe(true);
  });
});
