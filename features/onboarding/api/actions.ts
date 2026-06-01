"use server";

import {
  DISPLAY_NAME_TAKEN_MESSAGE,
  isDisplayNameUniqueViolation,
} from "@entities/profile";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { getZodErrorMessage } from "@shared/lib/validation";
import { updateTag } from "next/cache";
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
  const { supabase, userId, email } = auth;

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
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

  // display_name surfaces in the projects_with_vote_count view as
  // author_display_name, so the cached grid must be invalidated.
  updateTag(CACHE_TAGS.PROJECTS);
  return { ok: true };
}
