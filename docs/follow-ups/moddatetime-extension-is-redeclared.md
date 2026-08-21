# The moddatetime extension is declared in more than one schema file

**Symptom**: The declarative schema does not have a single owner for the `moddatetime` extension even though dependent tables only need to call its function.

**Observed evidence**: `rg -n "create extension if not exists moddatetime" supabase/schemas` in the current checkout finds declarations in both `supabase/schemas/cohorts.sql` and `supabase/schemas/subscribers.sql`.

**Suspected cause**: The subscribers table was added as a self-contained schema file and repeated the extension setup instead of relying on the earlier file in `schema_paths`.

**What was tried**: The shared Supabase workflow now records a single-owner convention, but the duplicate declaration was left unchanged because this agent-context upgrade explicitly excludes database schema changes.

**Proposed next step**: Verify a clean `supabase db reset` after removing the declaration from `supabase/schemas/subscribers.sql`, generate and inspect the resulting diff, and delete this follow-up when that schema cleanup ships.
