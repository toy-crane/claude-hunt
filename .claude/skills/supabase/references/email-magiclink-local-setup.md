# Email Magic Link (OTP) Local Setup

## Overview

Supabase supports passwordless email login via magic links using `signInWithOtp`. Locally, no SMTP setup is needed — Supabase ships with **Inbucket**, a fake email server that captures all outgoing emails.

## config.toml requirements

The default config already supports magic link login. Key settings:

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = false  # set true to require email verification
max_frequency = "1s"          # min interval between emails
otp_length = 6
otp_expiry = 3600             # 1 hour

[inbucket]
enabled = true
port = 54324
```

- `enable_confirmations = false` — users can sign in immediately without verifying their email
- `enable_confirmations = true` — users must click the magic link to verify before gaining access
- Inbucket web UI is at `http://localhost:54324`

## Client-side usage

Call `signInWithOtp` with the user's email. The `emailRedirectTo` option specifies where the magic link will redirect after verification.

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

- If the email doesn't exist, Supabase **auto-creates** the user and sends the magic link
- If the email exists, Supabase sends the magic link for sign-in
- No separate signup flow is needed

## Auth callback

Magic links use the same callback flow as OAuth. The link redirects to `site_url` with a `code` parameter, which is exchanged for a session via `exchangeCodeForSession(code)`. No additional route handler is needed if OAuth callback already exists.

## Local testing workflow

1. Enter any email on the login form
2. Open Inbucket at `http://localhost:54324`
3. Find the email in the inbox (search by the email address you entered)
4. Click the magic link in the email body
5. You'll be redirected to the app and signed in

## Rate limiting

The `[auth.rate_limit]` section controls how many emails can be sent:

```toml
[auth.rate_limit]
email_sent = 2              # emails per hour (increase for local dev)
token_verifications = 30    # OTP verifications per 5 min per IP
```

If you hit rate limits during local development, increase `email_sent` in `config.toml` and restart Supabase.
