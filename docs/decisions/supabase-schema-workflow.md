# Supabase Schema Workflow

## Decisions

- Local Supabase is the reference development environment. `supabase/schemas/` is the source of truth for the desired database structure, and `supabase/config.toml` records its dependency order.
- Ordinary structural changes start in the declarative schema and produce a migration with `supabase db diff -f <descriptive-name>`. Generated SQL is an untrusted draft, not the source of truth.
- `public.profiles` is the only database bridge from domain tables to `auth.users`. A domain table that identifies a user references `public.profiles(id)`, never `auth.users(id)` directly.
- Every `public` table ends with `created_at` and `updated_at`, both `timestamptz not null default now()`. Every table with `updated_at` declares `handle_updated_at` using the existing `extensions.moddatetime(updated_at)` function. The extension is owned by the earliest schema file and is not redeclared by dependent files.
- Review each generated migration against the declared final state before committing it. Treat destructive statements, managed- or cross-schema changes, extension changes, authorization changes, and view or function recreation as high risk unless the change is explicit and supported by project evidence.
- DML, backfills, Storage bucket rows, cross-schema policies, and other behavior that the current declarative diff cannot express may be added manually to the generated migration or to a separate versioned migration. A project-owned Storage bucket remains declared in `supabase/config.toml` for local environments and in an idempotent upsert migration for non-local environments.
- RLS and SQL privileges are separate controls. For each exposed table, view, and callable function, verify grants to `anon`, `authenticated`, `service_role`, and `PUBLIC`; for RLS, verify roles, commands, `USING`, `WITH CHECK`, and negative cross-user cases.
- Never edit a migration already applied to a shared or remote environment. Add a forward migration instead. Do not put arbitrary `BEGIN` or `COMMIT` statements inside ordinary migrations.
- Verify the full history with `supabase db reset`, run `bun run test:db`, and regenerate `shared/api/supabase/types.ts` with `bun run gen:types`. Commit the declarative schema, migration, database tests, and generated types as one logical change.

## Boundaries

- Dashboard, SQL Editor, local Studio, and the remote project are not schema sources of truth. Any intentional structural change made there must be represented in the declarative files.
- Do not freeze current diff-engine limitations as permanent facts. Read the installed official `supabase` and `supabase-postgres-best-practices` skills and verify version-sensitive behavior against current official documentation.
- This workflow does not authorize remote schema changes, migration repair, or deployment without the normal repository delivery path and required user approval.
- Migration review belongs to the implementing agent and its verification evidence; this repository does not require a custom reviewer agent.

## Why

A declarative source makes the desired schema readable without replaying migration history. Treating generated SQL as a draft protects data, privileges, and security properties that a structural diff can omit or misrepresent. Local replay, database tests, and regenerated types prove that version-controlled artifacts describe one reproducible contract.

## Reconsider when

- Supabase provides a declarative workflow that reliably owns the project's Storage data and managed-schema policies.
- The product introduces an authenticated identity model that cannot be represented through `public.profiles`.
- The local Supabase stack can no longer reproduce the deployment target closely enough to be the development reference.

## Still-rejected alternatives

- Hand-written migrations as the primary schema source — the final state becomes expensive to understand and drift is easier to introduce; reconsider only if declarative diff cannot represent the project's main schema.
- A repository-specific migration reviewer agent — isolated review can be useful, but the same checks were reproduced by Codex and Claude from project knowledge and official skills; reconsider if repeated migration defects escape the shared workflow.

## Evidence worth preserving

- In four no-guidance trials, Codex and Claude both missed the `public.profiles` ownership boundary and the exact timestamp trigger convention. With `AGENTS.md` loading this decision contract, both models applied them and surfaced a conflicting `auth.users` request instead of implementing it.
- Without a custom reviewer, both models reconstructed the Storage dual-source pattern and caught destructive extension and view recreation statements from the repository's schema, migrations, comments, and tests.
- A focused permission review without a custom reviewer identified that RLS does not remove table privileges, rejected `grant all` to client roles, required a forward migration for an applied change, and included reset, pgTAP, and type generation in verification.
