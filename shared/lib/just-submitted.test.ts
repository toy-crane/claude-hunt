import { beforeEach, describe, expect, it } from "vitest";
import { consumeJustSubmitted, setJustSubmitted } from "./just-submitted";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("just-submitted flag", () => {
  it("consume returns true exactly once after the flag is set", () => {
    setJustSubmitted("p1");
    expect(consumeJustSubmitted("p1")).toBe(true);
    expect(consumeJustSubmitted("p1")).toBe(false);
  });

  it("consume returns false when nothing was submitted", () => {
    expect(consumeJustSubmitted("p1")).toBe(false);
  });

  it("scopes the flag to the submitted project id", () => {
    setJustSubmitted("p1");
    expect(consumeJustSubmitted("other")).toBe(false);
    expect(consumeJustSubmitted("p1")).toBe(true);
  });
});
