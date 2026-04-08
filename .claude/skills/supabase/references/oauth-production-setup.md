# OAuth Production Setup

## Supabase Dashboard — URL Configuration

Go to **Authentication > URL Configuration** in the Supabase dashboard.

### Site URL

Set to your production domain:

```
https://my-app.vercel.app
```

This is the default redirect URL when a `redirectTo` value is not specified or doesn't match the allow-list. It is also used as a template variable in email templates.

### Redirect URLs

Add both local and production callback URLs to support both environments from a single Supabase project:

```
http://localhost:3000/auth/callback
https://my-app.vercel.app/auth/callback
```

Wildcards are allowed (e.g. `https://*.vercel.app/auth/callback`) but exact URLs are more secure.

## GitHub OAuth App

GitHub OAuth Apps only allow **one callback URL per app**. Create separate OAuth Apps for local and production.

### Production OAuth App

1. Go to GitHub > **Settings > Developer settings > OAuth Apps > New OAuth App**
2. Fill in:
   - **Application name**: `My App (Production)`
   - **Homepage URL**: `https://my-app.vercel.app`
   - **Authorization callback URL**: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client Secret**

### Local OAuth App

Keep the existing local OAuth App with:
- **Authorization callback URL**: `http://localhost:54321/auth/v1/callback`

## Google OAuth

1. Go to Google Cloud Console > **APIs & Services > Credentials**
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Under **Authorized redirect URIs**, add:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   Google supports multiple redirect URIs in a single app, so you can also add the local callback:
   ```
   http://localhost:54321/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**

### Skip nonce checks

In the Supabase dashboard under **Authentication > Providers > Google**, enable **Skip nonce checks**. This is required because Google's web-based ID tokens do not provide the nonce in an accessible way.

## Supabase Dashboard — Provider Configuration

Go to **Authentication > Providers** in the Supabase dashboard. For each provider (GitHub, Google):

1. Toggle **Enable Sign in with [Provider]** on
2. Enter the **Client ID** and **Client Secret** from the production OAuth app

## Client-Side — Dynamic redirectTo

Use `window.location.origin` so the same code works in both local and production environments:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "github", // or "google"
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

This resolves to `http://localhost:3000/auth/callback` locally and `https://my-app.vercel.app/auth/callback` in production. Both must be registered in the Supabase dashboard Redirect URLs.

## Dual Environment Strategy

| Environment | OAuth App Callback URL | Supabase Redirect URL |
|---|---|---|
| Local | `http://localhost:54321/auth/v1/callback` | `http://localhost:3000/auth/callback` |
| Production | `https://<ref>.supabase.co/auth/v1/callback` | `https://my-app.vercel.app/auth/callback` |

- **GitHub**: requires separate OAuth Apps per environment (single callback URL limit)
- **Google**: supports multiple redirect URIs in one app — one app can serve both
- **Supabase**: one project handles both via the Redirect URLs allow-list
