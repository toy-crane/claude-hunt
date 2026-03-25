---
title: "Type-safe environment variable management with T3 Env"
date: 2026-03-25
category: architecture
tags: [next.js, t3-env, zod, supabase, env-validation]
severity: low
---

## Problem

Three Supabase client files used `process.env.X ?? ""` to access environment variables. This pattern silently falls back to an empty string when variables are missing, causing runtime errors only when Supabase calls are made — making debugging difficult.

## Root Cause

No validation layer existed for environment variable access. Missing or invalid values passed through without any checks, allowing the app to start normally and fail later at Supabase call sites.

## Solution

Introduced `@t3-oss/env-nextjs` + `zod` for centralized, type-safe env management.

**Created `lib/env.ts`:**
```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
});
```

**Updated Supabase files:**
Replaced `process.env.X ?? ""` with `env.NEXT_PUBLIC_X` and added `import { env } from "@/lib/env"`.

## Prevention

- Always define new env vars in `lib/env.ts` schema before use — never access `process.env` directly
- Add server-only variables to the `server` section to prevent client bundle leakage
- Flag any direct `process.env` references during code review

## Related Files

- `lib/env.ts` (new)
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/proxy.ts`
