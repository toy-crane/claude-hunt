// Import directly from the schema module rather than the feature
// barrel so reusing the rules doesn't drag in the client-side
// `OnboardingForm` (which touches env validation at import time and
// breaks node-side tests).
import { onboardingInputSchema } from "@features/onboarding/api/schema.ts";

/**
 * Reuse onboarding's display-name rules so the two forms stay in
 * lockstep (trimmed, min 1 char, max 50). Messages are owned there.
 */
export const displayNameSchema = onboardingInputSchema.shape.displayName;
