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
    .min(1, "닉네임을 입력해 주세요.")
    .max(
      MAX_DISPLAY_NAME_LENGTH,
      `닉네임은 ${MAX_DISPLAY_NAME_LENGTH}자 이하로 입력해 주세요.`
    ),
  cohortId: z.string().uuid("과정를 선택해 주세요."),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
