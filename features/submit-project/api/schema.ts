import { z } from "zod";

export const MAX_TITLE_LENGTH = 80;
export const MAX_TAGLINE_LENGTH = 140;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MiB
export const ALLOWED_SCREENSHOT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedScreenshotMime =
  (typeof ALLOWED_SCREENSHOT_MIME_TYPES)[number];

/**
 * Text-side fields submitted via the form. The screenshot itself goes
 * through the browser upload helper first, then only its storage path
 * reaches the server action via `screenshot_path`.
 */
export const submitProjectInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(
      MAX_TITLE_LENGTH,
      `Title must be ${MAX_TITLE_LENGTH} characters or fewer`
    ),
  tagline: z
    .string()
    .trim()
    .min(1, "Tagline is required")
    .max(
      MAX_TAGLINE_LENGTH,
      `Tagline must be ${MAX_TAGLINE_LENGTH} characters or fewer`
    ),
  projectUrl: z
    .string()
    .trim()
    .url("Enter a valid URL starting with http:// or https://"),
  screenshotPath: z.string().trim().min(1, "Screenshot is required"),
});

export type SubmitProjectInput = z.infer<typeof submitProjectInputSchema>;

export interface ValidateScreenshotResult {
  error?: string;
  ok: boolean;
}

/** Fast client-side check before the storage upload call. */
export function validateScreenshotFile(file: File): ValidateScreenshotResult {
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return { ok: false, error: "File must be 5 MB or smaller" };
  }
  if (
    !ALLOWED_SCREENSHOT_MIME_TYPES.includes(file.type as AllowedScreenshotMime)
  ) {
    return {
      ok: false,
      error: "Only JPEG, PNG, or WebP images are allowed",
    };
  }
  return { ok: true };
}
