import "server-only";

import type { Database } from "@shared/api/supabase/types";
import { env } from "@shared/config/env";
import { createClient } from "@supabase/supabase-js";

export function createAnonServerClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
