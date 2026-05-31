import { createServerClient } from "./server";
import { getSessionClaims } from "./session";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

export type RequireAuthResult =
  | { ok: true; supabase: SupabaseServerClient; userId: string; email: string }
  | { ok: false; error: string };

/**
 * Gate a server action behind authentication. Resolves the viewer from the
 * locally-verified JWT claims (`getSessionClaims`) rather than a `getUser()`
 * round-trip — `claims.sub` is the authenticated user id. Authorization for
 * the actual mutation is still enforced by RLS on the returned client.
 */
export async function requireAuth(
  signedOutMessage: string
): Promise<RequireAuthResult> {
  const claims = await getSessionClaims();
  if (!claims) {
    return { ok: false, error: signedOutMessage };
  }
  const supabase = await createServerClient();
  return {
    ok: true,
    supabase,
    userId: claims.sub,
    email: claims.email ?? "",
  };
}
