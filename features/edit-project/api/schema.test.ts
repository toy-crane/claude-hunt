import { describe, expect, it } from "vitest";
import { editProjectInputSchema } from "./schema";

const validInput = {
  projectId: "00000000-0000-0000-0000-000000000001",
  title: "My App",
  tagline: "A cool tool",
  projectUrl: "https://myapp.com",
  imagePaths: ["user-1/shot.png"],
};

describe("editProjectInputSchema", () => {
  it("accepts a well-formed input with projectId", () => {
    const result = editProjectInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects a missing projectId", () => {
    const { projectId: _omitted, ...withoutId } = validInput;
    const result = editProjectInputSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only projectId after trim", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      projectId: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty (post-trim) title", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      title: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 80 chars", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      title: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tagline longer than 140 chars", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      tagline: "y".repeat(141),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL projectUrl", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      projectUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty imagePaths array", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      imagePaths: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts the projectFieldsSchema githubUrl when it matches the github.com pattern", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      githubUrl: "https://github.com/owner/repo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a githubUrl that does not match the github.com pattern", () => {
    const result = editProjectInputSchema.safeParse({
      ...validInput,
      githubUrl: "https://gitlab.com/owner/repo",
    });
    expect(result.success).toBe(false);
  });
});
