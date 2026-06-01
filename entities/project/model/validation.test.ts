import { describe, expect, it } from "vitest";
import { MAX_DESCRIPTION_LENGTH, MAX_TAGLINE_LENGTH } from "./constants";
import { projectFieldsSchema } from "./validation";

const base = {
  title: "My App",
  tagline: "A cool tool",
  projectUrl: "https://example.com",
  imagePaths: ["screenshots/a.png"],
};

describe("projectFieldsSchema · description (optional)", () => {
  it("accepts an omitted description", () => {
    const result = projectFieldsSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });

  it("normalizes an empty description to undefined", () => {
    const result = projectFieldsSchema.safeParse({ ...base, description: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });

  it("accepts a description at the maximum length", () => {
    const result = projectFieldsSchema.safeParse({
      ...base,
      description: "a".repeat(MAX_DESCRIPTION_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a description over the maximum length", () => {
    const result = projectFieldsSchema.safeParse({
      ...base,
      description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("preserves paragraph breaks in the description", () => {
    const text = "첫 문단입니다.\n\n둘째 문단입니다.";
    const result = projectFieldsSchema.safeParse({
      ...base,
      description: text,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toContain("\n");
    }
  });
});

describe("projectFieldsSchema · tagline (single line)", () => {
  it("flattens newlines into a single line", () => {
    const result = projectFieldsSchema.safeParse({
      ...base,
      tagline: "첫 줄\n둘째 줄",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagline).not.toContain("\n");
      expect(result.data.tagline).toBe("첫 줄 둘째 줄");
    }
  });

  it("accepts a tagline at the maximum length", () => {
    const result = projectFieldsSchema.safeParse({
      ...base,
      tagline: "가".repeat(MAX_TAGLINE_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a tagline over the maximum length", () => {
    const result = projectFieldsSchema.safeParse({
      ...base,
      tagline: "가".repeat(MAX_TAGLINE_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank tagline", () => {
    const result = projectFieldsSchema.safeParse({ ...base, tagline: "   " });
    expect(result.success).toBe(false);
  });
});
