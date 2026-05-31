import { describe, expect, it } from "vitest";
import { submitProjectInputSchema } from "./schema";

describe("submitProjectInputSchema", () => {
  it("accepts a well-formed input", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "My App",
      tagline: "A cool tool",
      projectUrl: "https://myapp.com",
      imagePaths: ["user-1/shot.png"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "   ",
      tagline: "A cool tool",
      projectUrl: "https://myapp.com",
      imagePaths: ["user-1/shot.png"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL project_url", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "My App",
      tagline: "A cool tool",
      projectUrl: "not-a-url",
      imagePaths: ["user-1/shot.png"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 80 chars", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "x".repeat(81),
      tagline: "A cool tool",
      projectUrl: "https://myapp.com",
      imagePaths: ["user-1/shot.png"],
    });
    expect(result.success).toBe(false);
  });
});
