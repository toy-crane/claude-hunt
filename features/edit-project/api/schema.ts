import { z } from "zod";

// Duplicated from submit-project to keep slice boundaries clean. Values
// must stay in lock-step with the DB CHECK constraints on
// public.projects (see supabase/schemas/projects.sql).
const MAX_TITLE_LENGTH = 80;
const MAX_TAGLINE_LENGTH = 140;

/**
 * Edit mirrors submit validation for text fields. Screenshot path is
 * optional: omit to keep the existing screenshot, supply to swap.
 */
export const editProjectInputSchema = z.object({
  projectId: z.string().trim().min(1, "Invalid project id"),
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
  screenshotPath: z.string().trim().min(1).optional(),
});

export type EditProjectInput = z.infer<typeof editProjectInputSchema>;
