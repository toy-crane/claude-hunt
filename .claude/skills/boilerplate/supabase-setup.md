# Step 3: Install & Configure Supabase

The template includes Supabase client utilities (`lib/supabase/`), proxy (`proxy.ts`), auth callback (`app/auth/callback/route.ts`), profile schema, and migrations. This step wires up the local environment.

## 3a. Install dependencies

```bash
bun install
```

## 3b. Start local Supabase

```bash
supabase start
```

Copy the **API URL** and **anon key** from the output.

## 3c. Create `.env`

Copy from the template and fill in the values printed by `supabase start`:

```bash
cp .env.example .env
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase start>
```

## 3d. Apply migrations

```bash
supabase db reset
```

This creates the `profiles` table, RLS policies, and the `handle_new_user` trigger.

## 3e. Verify Supabase is running

```bash
supabase test db
```

All pgTAP tests should pass.
