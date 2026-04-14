"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";
import { type OnboardingInput, onboardingInputSchema } from "./schema.ts";

export interface CompleteOnboardingResult {
  error?: string;
  ok: boolean;
}

// Postgres SQLSTATE for unique_violation. When this fires on the
// profiles_display_name_ci_unique index, we want the user to see a
// short, form-friendly message instead of the raw Supabase error.
const UNIQUE_VIOLATION_CODE = "23505";
const DISPLAY_NAME_UNIQUE_INDEX = "profiles_display_name_ci_unique";
const DISPLAY_NAME_TAKEN_MESSAGE = "That display name is already taken";

function isDisplayNameUniqueViolation(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  if (error.code !== UNIQUE_VIOLATION_CODE) {
    return false;
  }
  return (
    (error.message ?? "").includes(DISPLAY_NAME_UNIQUE_INDEX) ||
    (error.details ?? "").includes(DISPLAY_NAME_UNIQUE_INDEX)
  );
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

  // Upsert (not update) so the action still succeeds when the profile
  // row is missing — e.g. after a local `supabase db reset` that wipes
  // public.profiles but leaves auth.users intact, or any scenario where
  // the handle_new_user trigger did not fire. RLS restricts the insert
  // path to the signed-in user's own id.
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
