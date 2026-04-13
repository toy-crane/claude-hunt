import { describe, expect, it } from "vitest";
import {
  MAX_SCREENSHOT_BYTES,
  submitProjectInputSchema,
  validateScreenshotFile,
} from "./schema.ts";

const ALLOWED_MIME_ERROR = /JPEG, PNG, or WebP/;
const SIZE_ERROR = /5 MB/;

function makeFile(name: string, type: string, bytes: number): File {
  const buffer = new Uint8Array(bytes);
  return new File([buffer], name, { type });
}

describe("submitProjectInputSchema", () => {
  it("accepts a well-formed input", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "My App",
      tagline: "A cool tool",
      projectUrl: "https://myapp.com",
      screenshotPath: "user-1/shot.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "   ",
      tagline: "A cool tool",
      projectUrl: "https://myapp.com",
      screenshotPath: "user-1/shot.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL project_url", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "My App",
      tagline: "A cool tool",
      projectUrl: "not-a-url",
      screenshotPath: "user-1/shot.png",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 80 chars", () => {
    const result = submitProjectInputSchema.safeParse({
      title: "x".repeat(81),
      tagline: "A cool tool",
      projectUrl: "https://myapp.com",
      screenshotPath: "user-1/shot.png",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateScreenshotFile", () => {
  it.each([
    ["image/jpeg", "shot.jpg"],
    ["image/png", "shot.png"],
    ["image/webp", "shot.webp"],
  ])("accepts %s", (mime, name) => {
    const file = makeFile(name, mime, 1024);
    expect(validateScreenshotFile(file).ok).toBe(true);
  });

  it("rejects .gif by MIME type", () => {
    const file = makeFile("shot.gif", "image/gif", 1024);
    const result = validateScreenshotFile(file);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(ALLOWED_MIME_ERROR);
  });

  it("rejects files larger than 5 MB", () => {
    const file = makeFile("big.png", "image/png", MAX_SCREENSHOT_BYTES + 1);
    const result = validateScreenshotFile(file);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(SIZE_ERROR);
  });
});
