import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getZodErrorMessage, getZodFieldErrors } from "./validation";

const STARTS_WITH_A = /^a/;

const schema = z.object({
  title: z.string().min(1, "title required"),
  url: z.string().url("bad url"),
});

function parseError(input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) {
    throw new Error("expected a validation failure");
  }
  return result.error;
}

describe("getZodErrorMessage", () => {
  it("returns the first issue message", () => {
    const error = parseError({ title: "", url: "nope" });
    expect(getZodErrorMessage(error, "fallback")).toBe("title required");
  });
});

describe("getZodFieldErrors", () => {
  it("maps each field to its first issue message", () => {
    const error = parseError({ title: "", url: "nope" });
    expect(getZodFieldErrors(error)).toEqual({
      title: "title required",
      url: "bad url",
    });
  });

  it("keeps the first message when a field has multiple issues", () => {
    const multi = z.object({
      name: z.string().min(3, "too short").regex(STARTS_WITH_A, "must start a"),
    });
    const result = multi.safeParse({ name: "b" });
    if (result.success) {
      throw new Error("expected a validation failure");
    }
    expect(getZodFieldErrors(result.error).name).toBe("too short");
  });
});
