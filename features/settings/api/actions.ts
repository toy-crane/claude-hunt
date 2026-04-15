"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import {
  DISPLAY_NAME_TAKEN_MESSAGE,
  isDisplayNameUniqueViolation,
} from "@shared/lib/display-name-violation";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath } from "next/cache";

import { displayNameSchema } from "./schema";

export type UpdateDisplayNameResult =
  | { ok: true }
  | { error: { field: "displayName"; message: string }; ok: false };

export async function updateDisplayName(
  raw: string
): Promise<UpdateDisplayNameResult> {
  const parsed = displayNameSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        field: "displayName",
        message: getZodErrorMessage(parsed.error, "Invalid display name"),
      },
    };
  }

  const auth = await requireAuth(
    "You must be signed in to update your display name"
  );
  if (!auth.ok) {
    return {
      ok: false,
      error: { field: "displayName", message: auth.error },
    };
  }
  const { supabase, user } = auth;

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
