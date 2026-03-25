# Google/GitHub OAuth Setup Guide

This guide explains how to obtain OAuth credentials for Supabase local development.

## Google OAuth

### 1. Create OAuth 2.0 Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select or create a project
3. Click **"Create Credentials"** → **"OAuth client ID"**
4. Application type: **"Web application"**
5. Add authorized JavaScript origins:
   - `http://127.0.0.1:3000`
6. Add authorized redirect URIs:
   - `http://127.0.0.1:54321/auth/v1/callback`
7. Click **"Create"**

### 2. Copy Credentials

- **Client ID** → `SUPABASE_AUTH_GOOGLE_CLIENT_ID`
- **Client Secret** → `SUPABASE_AUTH_GOOGLE_SECRET`

### 3. Add to `supabase/.env`

```
SUPABASE_AUTH_GOOGLE_CLIENT_ID=<your-client-id>
SUPABASE_AUTH_GOOGLE_SECRET=<your-client-secret>
```

> Note: `skip_nonce_check = true` is set in `config.toml` for Google — required for local sign-in.

---

## GitHub OAuth

### 1. Register OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: Your project name (e.g., `claude-hunt-local`)
   - **Homepage URL**: `http://127.0.0.1:3000`
   - **Authorization callback URL**: `http://127.0.0.1:54321/auth/v1/callback`
4. Click **"Register application"**

### 2. Generate Client Secret

- Click **"Generate a new client secret"**
- Copy it immediately (it won't be shown again)

### 3. Copy Credentials

- **Client ID** → `SUPABASE_AUTH_GITHUB_CLIENT_ID`
- **Client Secret** → `SUPABASE_AUTH_GITHUB_SECRET`

### 4. Add to `supabase/.env`

```
SUPABASE_AUTH_GITHUB_CLIENT_ID=<your-client-id>
SUPABASE_AUTH_GITHUB_SECRET=<your-client-secret>
```

---

## After Configuration

Restart Supabase to apply changes:

```bash
supabase stop
supabase start
```

Verify providers are enabled in Supabase Studio at `http://127.0.0.1:54323` → Authentication → Providers.
