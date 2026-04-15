import { MAX_TAGLINE_LENGTH, MAX_TITLE_LENGTH } from "@entities/project";
import { z } from "zod";

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
