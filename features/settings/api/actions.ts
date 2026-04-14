"use server";

import { createClient } from "@shared/api/supabase/server";
import { revalidatePath } from "next/cache";

import { displayNameSchema } from "./schema";

export type UpdateDisplayNameResult =
  | { ok: true }
  | { error: { field: "displayName"; message: string }; ok: false };

// Postgres SQLSTATE for unique_violation. Mapped to a form-friendly
// message when it fires on the profiles_display_name_ci_unique index;
// other 23505s (from future constraints) pass through unchanged.
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
 * Server action: updates the signed-in user's display_name. Uses the
 * same zod rules as onboarding (trimmed, required, max 50 chars) via
 * `displayNameSchema`, which re-exports `onboardingInputSchema.shape.displayName`.
 * Revalidates `/` and `/settings` so the project grid and the form
 * itself reflect the new value.
 */
export async function updateDisplayName(
  raw: string
): Promise<UpdateDisplayNameResult> {
  const parsed = displayNameSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues.at(0);
    return {
      ok: false,
      error: {
        field: "displayName",
        message: first?.message ?? "Invalid display name",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      ok: false,
      error: {
        field: "displayName",
        message: "You must be signed in to update your display name",
      },
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);

  if (updateError) {
    const message = isDisplayNameUniqueViolation(updateError)
      ? DISPLAY_NAME_TAKEN_MESSAGE
      : updateError.message;
    return {
      ok: false,
      error: { field: "displayName", message },
    };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
