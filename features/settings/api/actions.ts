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
import { z } from "zod";

/**
 * Input for the settings profile save. `cohortId` is optional so a viewer
 * without a cohort (or whose cohort is hidden from the list, e.g. the
 * operator-only TOYCRANE) can still save their nickname alone.
 */
const updateProfileInputSchema = z.object({
  displayName: displayNameSchema,
  cohortId: z.string().uuid("클래스를 선택해 주세요.").optional(),
});

export type UpdateProfileInput = z.input<typeof updateProfileInputSchema>;

export type UpdateProfileResult =
  | { ok: true }
  | {
      error: { field: "cohortId" | "displayName"; message: string };
      ok: false;
    };

export async function updateProfile(
  raw: UpdateProfileInput
): Promise<UpdateProfileResult> {
  const parsed = updateProfileInputSchema.safeParse(raw);
  if (!parsed.success) {
    const field =
      parsed.error.issues[0]?.path[0] === "cohortId"
        ? "cohortId"
        : "displayName";
    return {
      ok: false,
      error: {
        field,
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

  const patch: { cohort_id?: string; display_name: string } = {
    display_name: parsed.data.displayName,
  };
  if (parsed.data.cohortId) {
    patch.cohort_id = parsed.data.cohortId;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(patch)
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
