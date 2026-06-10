"use server";

import {
  DISPLAY_NAME_TAKEN_MESSAGE,
  displayNameSchema,
  isDisplayNameUniqueViolation,
} from "@entities/profile";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { getZodErrorMessage } from "@shared/lib/validation";
import { refresh, updateTag } from "next/cache";

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
        message: getZodErrorMessage(parsed.error, "닉네임을 확인해 주세요."),
      },
    };
  }

  const auth = await requireAuth("로그인이 풀렸어요. 다시 로그인해 주세요.");
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
  updateTag(CACHE_TAGS.PROJECTS);
  refresh();
  return { ok: true };
}
