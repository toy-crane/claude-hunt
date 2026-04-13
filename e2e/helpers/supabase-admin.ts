import { createClient } from "@supabase/supabase-js";

export const E2E_EMAIL_PREFIX = "e2e-";
export const E2E_EMAIL_DOMAIN = "test.local";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!(url && secretKey)) {
    throw new Error(
      "E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local"
    );
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function uniqueTestEmail() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${E2E_EMAIL_PREFIX}${Date.now()}-${rand}@${E2E_EMAIL_DOMAIN}`;
}
