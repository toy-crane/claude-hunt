---
title: "OAuth Callback Fails Due to localhost vs 127.0.0.1 Mismatch"
date: 2026-03-25
category: integration-issues
tags: [supabase, oauth, config]
severity: medium
---

## Problem

OAuth login behaved inconsistently:
- Accessing via `localhost:3000` → redirected to `localhost:3000` without session (not logged in)
- Accessing via `127.0.0.1:3000` → redirected to `127.0.0.1:3000/?code=...` with session but code param visible in URL

In both cases, the `/auth/callback` route was bypassed.

## Root Cause

Supabase's `additional_redirect_urls` in `config.toml` performs **exact string matching**. The configuration had `http://127.0.0.1:3000/auth/callback`, but `login-form.tsx` uses `window.location.origin` to build the `redirectTo` URL.

When accessing via `localhost:3000`:
1. `redirectTo` becomes `http://localhost:3000/auth/callback`
2. Supabase can't find this in the allow-list (only `127.0.0.1` is listed)
3. Falls back to `site_url` (`http://127.0.0.1:3000`), redirecting to `/?code=...`
4. The `/auth/callback` route is never hit, so `exchangeCodeForSession()` is never called server-side

The Supabase browser client detects the `code` param and exchanges it client-side, which is why the session still gets established in some cases — but the code param remains in the URL.

## Solution

Unified all URLs to use `localhost`:

1. **`supabase/config.toml`**: `site_url` and `additional_redirect_urls` → `http://localhost:3000`
2. **`supabase/config.toml`**: `[auth.external.google]` and `[auth.external.github]` — set `redirect_uri = "http://localhost:54321/auth/v1/callback"` **(key fix)**
   - Supabase CLI auto-generates the `redirect_uri` sent to OAuth providers based on its API URL (`127.0.0.1:54321`)
   - Without an explicit override, the `redirect_uri` will always be `127.0.0.1`, causing a mismatch with the OAuth provider console's `localhost` callback URL
   - This results in "redirect_uri is not associated with this application" errors from the provider
3. **OAuth provider consoles** (Google, GitHub): callback URL → `http://localhost:54321/auth/v1/callback`
4. **Skill docs** (`init-project/supabase-auth.md`): updated all URL references

## Prevention

- Always use `localhost` for local development URLs across all configuration surfaces
- When setting up OAuth, verify that `config.toml`, OAuth provider console, and browser access URL all use the same hostname
- `additional_redirect_urls` is exact match — any hostname/port/path difference will cause a fallback

## Related Files

- `supabase/config.toml` — `site_url`, `additional_redirect_urls`
- `components/login-form.tsx` — `window.location.origin` used for `redirectTo`
- `app/auth/callback/route.ts` — server-side code exchange
- `.claude/skills/init-project/supabase-auth.md` — OAuth setup guide
