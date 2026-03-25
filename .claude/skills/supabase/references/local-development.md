# Local Development URL Convention

## Rule: Use `localhost` consistently

All local development URLs must use `localhost` (not `127.0.0.1`) across every configuration surface:

| Where | Setting |
|-------|---------|
| `supabase/config.toml` | `site_url`, `additional_redirect_urls` |
| `supabase/config.toml` | `[auth.external.*] redirect_uri` **(critical)** |
| OAuth provider console | Authorized origins, callback URLs |
| Browser access | `http://localhost:3000` |

## Why this matters

Supabase's `additional_redirect_urls` performs **exact string matching**. If the app runs on `localhost:3000` but the allow-list says `127.0.0.1:3000`, the redirect URL won't match. Supabase then falls back to `site_url` (the home page), bypassing `/auth/callback` entirely.

Symptoms of a mismatch:
- `?code=...` appearing in the home page URL instead of being handled by the callback route
- Login working inconsistently depending on which hostname was used to access the app
- OAuth session not being established despite the provider authenticating successfully

## OAuth provider callback URL

The callback URL in OAuth provider consoles (Google, GitHub) should point to the **Supabase Auth server**, not your app:

```
http://localhost:54321/auth/v1/callback
```

The flow is: App → Provider → Supabase Auth (port 54321) → Your app's `/auth/callback` route.

**Important:** You must also set `redirect_uri` in each `[auth.external.*]` section of `config.toml`:

```toml
[auth.external.github]
redirect_uri = "http://localhost:54321/auth/v1/callback"

[auth.external.google]
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

Without this, Supabase CLI auto-generates the `redirect_uri` from its API URL (`127.0.0.1:54321`), which won't match the `localhost` callback URL registered in the OAuth provider console.

## macOS note

On macOS, `localhost` reliably resolves to `127.0.0.1` (IPv4). The IPv6 ambiguity issue that affects some Linux systems is not a concern here.
