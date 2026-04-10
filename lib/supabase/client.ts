import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env.ts";
import type { Database } from "@/types/database.types.ts";

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
