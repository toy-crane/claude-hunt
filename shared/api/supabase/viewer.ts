import { cache } from "react";

import { createClient } from "./server.ts";

export interface Viewer {
  avatarUrl: string | null;
  cohortId: string | null;
  displayName: string | null;
  email: string;
  id: string;
}

/**
 * Fetch the signed-in viewer's identity + profile slice, deduplicated
 * via React.cache() within a single render tree. Returns `null` for
 * anonymous visitors. The union of columns selected covers every
 * RSC that needs viewer data (Header, home page, settings page), so
 * repeated callers don't re-issue getUser() or re-query profiles.
 */
export const fetchViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, cohort_id, email")
    .eq("id", user.id)
    .single();
  return {
    id: user.id,
    email: data?.email ?? user.email ?? "",
    displayName: data?.display_name ?? null,
    avatarUrl: data?.avatar_url ?? null,
    cohortId: data?.cohort_id ?? null,
  };
});
