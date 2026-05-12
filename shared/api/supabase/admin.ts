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
 */
export function createAdminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
