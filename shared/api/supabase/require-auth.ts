import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RequireAuthResult =
  | { ok: true; supabase: SupabaseServerClient; user: User }
  | { ok: false; error: string };

export async function requireAuth(
  signedOutMessage: string
): Promise<RequireAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, error: signedOutMessage };
  }
  return { ok: true, supabase, user };
}
