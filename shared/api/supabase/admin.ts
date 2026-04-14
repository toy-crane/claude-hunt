import "server-only";

import type { Database } from "@shared/api/supabase/types";
import { env } from "@shared/config/env";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for privileged server-side operations
 * (e.g. `auth.admin.deleteUser`). Bypasses RLS — do not use from client
 * code and never expose this client to the browser. Callers are
 * responsible for validating the authenticated user's identity before
 * performing any admin action.
 *
 * `SUPABASE_SECRET_KEY` is read from `process.env` at call time rather
 * than validated in `env.ts` so the app can boot without it (the key is
 * only required when a privileged action actually runs). This matches
 * the existing `e2e/helpers/supabase-admin.ts` pattern.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Add it to your environment (see .env.example)."
    );
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
