"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";
import { type OnboardingInput, onboardingInputSchema } from "./schema.ts";

export interface CompleteOnboardingResult {
  error?: string;
  ok: boolean;
}

/**
 * Server action: writes the display name and cohort id to the signed-in
 * user's own profile row. The onboarding gate (middleware + /onboarding
 * page) ensures this is only reached by signed-in users who have not yet
 * picked a cohort; the signed-in and input checks here are defence in
 * depth for direct action calls.
 */
export async function completeOnboarding(
  raw: OnboardingInput
): Promise<CompleteOnboardingResult> {
  const parsed = onboardingInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues.at(0);
    return { ok: false, error: first?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: "You must be signed in to continue" };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      cohort_id: input.cohortId,
    })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/");
  return { ok: true };
}
