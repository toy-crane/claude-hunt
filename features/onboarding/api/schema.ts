import { displayNameSchema } from "@entities/profile";
import { z } from "zod";

/**
 * Input for the onboarding completion action. `displayName` is trimmed
 * and policy-validated by the shared schema in `@entities/profile`.
 * `cohortId` must be a real uuid — the UI always selects from the
 * cohort list, so a non-uuid means the user didn't pick an option.
 */
export const onboardingInputSchema = z.object({
  displayName: displayNameSchema,
  cohortId: z.string().uuid("클래스를 선택해 주세요."),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
