import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    // Optional: Sentry stays silent when unset.
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  server: {
    SUPABASE_SECRET_KEY: z.string().min(1),
    // Local-only opt-in for /auth/dev-login. The route requires the exact
    // string "true"; any other value keeps it 404. Deliberately a bare
    // optional string (not an enum) so a stray value can never fail boot
    // validation — the flag fails closed instead.
    DEV_LOGIN_ENABLED: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    DEV_LOGIN_ENABLED: process.env.DEV_LOGIN_ENABLED,
  },
});
