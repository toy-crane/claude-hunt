"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import {
  DISPLAY_NAME_TAKEN_MESSAGE,
  isDisplayNameUniqueViolation,
} from "@shared/lib/display-name-violation";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath } from "next/cache";
import { type OnboardingInput, onboardingInputSchema } from "./schema";

export interface CompleteOnboardingResult {
  error?: string;
  ok: boolean;
}

/**
 * Upsert (not update): the action must still succeed when the profile
 * row is missing — e.g. after a local `supabase db reset` or any
 * scenario where the handle_new_user trigger did not fire. RLS
 * restricts the insert path to the signed-in user's own id.
 */
export async function completeOnboarding(
  raw: OnboardingInput
): Promise<CompleteOnboardingResult> {
  const parsed = onboardingInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: getZodErrorMessage(parsed.error, "Invalid input"),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("You must be signed in to continue");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, user } = auth;

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      display_name: input.displayName,
      cohort_id: input.cohortId,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    if (isDisplayNameUniqueViolation(upsertError)) {
      return { ok: false, error: DISPLAY_NAME_TAKEN_MESSAGE };
    }
    return { ok: false, error: upsertError.message };
  }

  revalidatePath("/");
  return { ok: true };
}
