import "server-only";

import { cache } from "react";

import { createServerClient } from "./server";

/**
 * Request-deduplicated viewer session claims.
 *
 * Verifies the access token locally via `getClaims()` (asymmetric JWT
 * signing keys + cached JWKS) instead of `getUser()`, which round-trips to
 * the Supabase Auth server on every call. The claims are signature-verified,
 * so they are safe to trust server-side — unlike the unverified `getSession()`.
 *
 * Wrapped in React `cache()` so the Header, page, and any server action that
 * needs the viewer in one render pass share a single verification. Returns
 * `null` for anonymous visitors.
 *
 * `claims.sub` is the authenticated user id (== `auth.users.id`); `claims.email`
 * is present for email identities. Profile fields (display name, avatar, cohort)
 * are NOT in the JWT — read those from `profiles` where needed.
 */
export const getSessionClaims = cache(async () => {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return null;
  }
  return data.claims;
});
