"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";

import { displayNameSchema } from "./schema.ts";

export type UpdateDisplayNameResult =
  | { ok: true }
  | { error: { field: "displayName"; message: string }; ok: false };

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
    return {
      ok: false,
      error: { field: "displayName", message: updateError.message },
    };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
