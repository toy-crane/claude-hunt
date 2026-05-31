"use server";

import {
  DISPLAY_NAME_TAKEN_MESSAGE,
  displayNameSchema,
  isDisplayNameUniqueViolation,
} from "@entities/profile";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath, updateTag } from "next/cache";

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
  const { supabase, userId } = auth;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", userId);

  if (updateError) {
    const message = isDisplayNameUniqueViolation(updateError)
      ? DISPLAY_NAME_TAKEN_MESSAGE
      : updateError.message;
    return {
      ok: false,
      error: { field: "displayName", message },
    };
  }

  // display_name surfaces in the cached projects grid as author_display_name.
  updateTag(CACHE_TAGS.PROJECTS_GRID);
  revalidatePath("/settings");
  return { ok: true };
}
