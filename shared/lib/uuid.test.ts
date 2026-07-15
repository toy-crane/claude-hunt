import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("accepts a canonical lowercase UUID", () => {
    expect(isUuid("74394177-3371-4cfe-8ba8-a4cefb884cd5")).toBe(true);
  });

  it("accepts an uppercase UUID", () => {
    expect(isUuid("74394177-3371-4CFE-8BA8-A4CEFB884CD5")).toBe(true);
  });

  it("rejects a UUID with a trailing url-encoded backslash", () => {
    expect(isUuid("74394177-3371-4cfe-8ba8-a4cefb884cd5%5C")).toBe(false);
  });

  it("rejects a UUID with a trailing backslash", () => {
    expect(isUuid("74394177-3371-4cfe-8ba8-a4cefb884cd5\\")).toBe(false);
  });

  it("rejects an arbitrary non-uuid string", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isUuid("")).toBe(false);
  });

  it("rejects a UUID with surrounding whitespace", () => {
    expect(isUuid(" 74394177-3371-4cfe-8ba8-a4cefb884cd5 ")).toBe(false);
  });
});
