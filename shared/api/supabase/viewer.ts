import { cache } from "react";

import { createServerClient } from "./server";
import { getSessionClaims } from "./session";

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
 * anonymous visitors. Identity comes from the locally-verified JWT claims
 * (`getSessionClaims`, no Auth-server round-trip); the profile slice
 * (display name, avatar, cohort) is read from `profiles` since those are
 * not carried in the token.
 */
export const fetchViewer = cache(async (): Promise<Viewer | null> => {
  const claims = await getSessionClaims();
  if (!claims) {
    return null;
  }
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, cohort_id, email")
    .eq("id", claims.sub)
    .single();
  return {
    id: claims.sub,
    email: data?.email ?? claims.email ?? "",
    displayName: data?.display_name ?? null,
    avatarUrl: data?.avatar_url ?? null,
    cohortId: data?.cohort_id ?? null,
  };
});
