import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./safe-next-path";

const FALLBACK = "/fallback";

describe("sanitizeNextPath", () => {
  it("returns the fallback when the raw value is undefined", () => {
    expect(sanitizeNextPath(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("returns the fallback when the raw value is an array (duplicated query key)", () => {
    expect(sanitizeNextPath(["/a", "/b"], FALLBACK)).toBe(FALLBACK);
  });

  it("returns the fallback when the value is missing the leading slash", () => {
    expect(sanitizeNextPath("settings", FALLBACK)).toBe(FALLBACK);
    expect(sanitizeNextPath("https://evil.com/path", FALLBACK)).toBe(FALLBACK);
  });

  it("returns the fallback when the value is protocol-relative (//host/path)", () => {
    expect(sanitizeNextPath("//evil.com/path", FALLBACK)).toBe(FALLBACK);
  });

  it("returns the raw value when it is a normal same-origin path", () => {
    expect(sanitizeNextPath("/settings", FALLBACK)).toBe("/settings");
    expect(sanitizeNextPath("/projects/abc/edit", FALLBACK)).toBe(
      "/projects/abc/edit"
    );
  });
});
