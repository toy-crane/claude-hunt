# OAuth Local Setup

## Rule: Use `localhost` consistently

All local development URLs must use `localhost` (not `127.0.0.1`). Supabase's `additional_redirect_urls` performs **exact string matching** — a hostname mismatch silently breaks OAuth callbacks.

## config.toml setup

Set `redirect_uri` explicitly in each `[auth.external.*]` section. Without this, Supabase CLI auto-generates URLs with `127.0.0.1`.

```toml
[auth.external.github]
redirect_uri = "http://localhost:54321/auth/v1/callback"

[auth.external.google]
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

## OAuth provider callback URL

Register this callback URL in each OAuth provider console (Google, GitHub):

```
http://localhost:54321/auth/v1/callback
```
