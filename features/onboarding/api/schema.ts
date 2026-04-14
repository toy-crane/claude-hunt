import { z } from "zod";

export const MAX_DISPLAY_NAME_LENGTH = 50;

/**
 * Input for the onboarding completion action. `displayName` is trimmed
 * before validation so whitespace-only inputs are rejected the same way
 * as empty strings. `cohortId` must be a real uuid — the UI always
 * selects from the cohort list, so a non-uuid means the user didn't
 * pick an option.
 */
export const onboardingInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(
      MAX_DISPLAY_NAME_LENGTH,
      `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`
    ),
  cohortId: z.string().uuid("Please select a cohort"),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
