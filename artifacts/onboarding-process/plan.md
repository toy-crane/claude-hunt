# Onboarding Process — Implementation Plan

## Context

The spec (`artifacts/onboarding-process/spec.md`) adds a hard gate: any signed-in user whose `profiles.cohort_id` is null is redirected to a new `/onboarding` screen that collects a display name and a cohort selection. After submit, the user returns to the originally requested URL.

Today, Micro-Hunt handles the "no cohort assigned" case passively by showing a "Contact your instructor" banner on the submission form (`features/submit-project/ui/submit-form.tsx:98-106` + `features/submit-project/api/actions.ts:45-51`). This plan replaces that dead-end with the onboarding flow and cleans up the now-unreachable UI branch.

The existing `handle_new_user` trigger (`supabase/migrations/20260325024939_create_profile_trigger.sql:13-18`) also copies the OAuth-derived name into `display_name` on signup. Because onboarding is now the sole, user-driven writer of `display_name`, that auto-population must be removed so the column starts NULL and reflects exactly what the user typed. No table-shape changes — `profiles.display_name` and `profiles.cohort_id` columns (`supabase/schemas/profiles.sql`) and the own-row update RLS policy already support the new flow. The existing `fetchCohorts()` helper (`features/cohort-filter/api/fetch-cohorts.ts`) is reused verbatim.

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Gate mechanism | Root `middleware.ts` + in-page redirect in `app/onboarding/page.tsx` | Middleware covers every route (spec invariant: "No bypass path"). In-page redirect handles the mirror case (onboarded user hitting `/onboarding` directly). Two gates, one direction each. |
| Redirect param convention | `?next=<path>`, sanitized to `/` when not starting with `/` | Matches existing auth callback (`app/auth/callback/route.ts:9-11`). Open-redirect guard already battle-tested and unit-covered. |
| Server-side validation | Zod schema in `features/onboarding/api/schema.ts`, reused by the action | Same pattern as `features/submit-project/api/schema.ts`. Single source of truth for `{display_name, cohort_id}` rules. |
| Form component shape | Client component with `useState` + plain `async onSubmit`, mirroring `submit-form.tsx:39-90` | Existing convention in this codebase. `useActionState` is not used elsewhere; stay consistent. |
| Reading `next` from the client | `useSearchParams()` wrapped in `<Suspense>` | Project rule (`.claude/skills/next-best-practices/suspense-boundaries.md`) — the recent Radix hydration fix (`app/page.tsx:63`) is the live example. |
| Profile `cohortId` type post-feature | Tighten `SubmitFormProps.cohortId` from `string \| null` to `string` | The null branch is now unreachable via UI; the server action retains its own defensive null-check for defence-in-depth. |
| Defensive cohort guard in `submitProject` | Keep (`features/submit-project/api/actions.ts:45-51`) | Defence-in-depth per spec invariant: a direct action call without UI must still be rejected. Error message can stay. |
| Profile trigger ownership of `display_name` | Remove auto-population from `handle_new_user` | Onboarding is now the single, user-controlled writer. Removing the trigger's write prevents users from briefly having an OAuth-derived handle they didn't choose, and keeps pre-onboarding state semantically clear (cohort null ⇔ display_name also null). `full_name` and `avatar_url` continue to be captured from OAuth as before. |

## Infrastructure Resources

One migration (trigger function replacement). No new buckets, cron, env vars, tables, or columns.

| Resource | Type | Declared in | Creation Task |
|---|---|---|---|
| Replacement of `public.handle_new_user()` trigger function | Trigger function (DDL) | new `supabase/migrations/<timestamp>_drop_display_name_from_profile_trigger.sql` | Task 1 |

Per `.claude/rules/supabase-migration.md`, triggers use the **Manual Migration Path** (`supabase migration new …`), not `supabase db diff`.

## Data Model

No entity or column additions. Read/write contract changes:

### Profile (existing — `entities/profile`)
- `id` (required, PK → auth.users)
- `display_name` (text, nullable — **now starts NULL on signup** and is written exclusively by the onboarding server action)
- `full_name` (text, nullable — still populated on signup from OAuth metadata — no behavior change)
- `cohort_id` (uuid, nullable FK → cohorts — gate condition; non-null ⇔ onboarded)
- Other fields (`email`, `avatar_url`, timestamps) — untouched

### Cohort (existing — `entities/cohort`)
- Read-only within this feature via `fetchCohorts()` → `Cohort[]` sorted by name

## Required Skills

| Skill | Applicable Task | Purpose |
|---|---|---|
| test-driven-development | All tasks | RED → GREEN per Success Criteria; colocated `*.test.ts(x)` / pgTAP `*_test.sql` |
| supabase | Tasks 1, 2 | Manual migration path for triggers; `createClient()` server usage; RLS-scoped update; pgTAP trigger assertion |
| fsd | Tasks 2, 3, 4 | New `features/onboarding/` slice with `api/`, `ui/`, `index.ts` barrel |
| next-best-practices | Tasks 4, 5 | Middleware matcher, `page.tsx` server component, Suspense for `useSearchParams`, `redirect()` from `next/navigation` |
| shadcn | Task 3 | Use existing `Field`, `FieldLabel`, `Input`, `Select`, `Button`, `Alert`, `Spinner` primitives (no new component install) |
| vercel-react-best-practices | Task 3 | `useTransition` for the submit pending state; avoid sync blocking |
| security-and-hardening | Tasks 2, 5 | Open-redirect sanitization on `next` param; preserve server-action defensive guard |
| incremental-implementation | All tasks | Each task leaves a runnable, testable system |

## Affected Files

| Path | Change Type | Task |
|---|---|---|
| `supabase/migrations/<timestamp>_drop_display_name_from_profile_trigger.sql` | New | 1 |
| `supabase/tests/profiles_test.sql` | Modify (flip the `display_name = full_name` assertion to `display_name IS NULL`) | 1 |
| `features/onboarding/api/schema.ts` | New | 2 |
| `features/onboarding/api/schema.test.ts` | New | 2 |
| `features/onboarding/api/actions.ts` | New | 2 |
| `features/onboarding/api/actions.test.ts` | New | 2 |
| `features/onboarding/ui/onboarding-form.tsx` | New | 3 |
| `features/onboarding/ui/onboarding-form.test.tsx` | New | 3 |
| `features/onboarding/index.ts` | New | 3 |
| `app/onboarding/page.tsx` | New | 4 |
| `app/onboarding/page.test.tsx` | New | 4 |
| `middleware.ts` | New | 5 |
| `middleware.test.ts` | New | 5 |
| `features/submit-project/ui/submit-form.tsx` | Modify | 6 |
| `features/submit-project/ui/submit-form.test.tsx` | Modify | 6 |
| `features/submit-project/index.ts` | Modify (type tightening if re-exported) | 6 |
| `app/page.tsx` | Modify (pass tightened `cohortId` type) | 6 |
| `artifacts/micro-hunt/spec.md` | Modify (obsolete scenario 4) | 6 |

Reuse (no changes): `shared/api/supabase/server.ts`, `shared/api/supabase/proxy.ts`, `features/cohort-filter/api/fetch-cohorts.ts`, `entities/profile`, `entities/cohort`, `shared/lib/test-utils.tsx`. The `handle_new_user` function is **replaced in place** (CREATE OR REPLACE) — the trigger binding on `auth.users` is untouched, and the existing `20260325024939_create_profile_trigger.sql` migration is left historical.

## Tasks

### Task 1: Stop the profile-creation trigger from writing `display_name`

- **Covers**: No new scenario — supports Spec scenario 2 criterion 4 (stored display name reflects onboarding input exclusively) and the "Completion condition is single-field" invariant (no pre-onboarded state with a ghost display name).
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - supabase — Manual Migration Path for triggers (`.claude/rules/supabase-migration.md`)
  - `supabase/migrations/20260325024939_create_profile_trigger.sql:13-18` — the current function body that will be replaced
  - `supabase/tests/profiles_test.sql:101-105` — the pgTAP assertion that must flip
- **Implementation targets**:
  - `supabase/migrations/<timestamp>_drop_display_name_from_profile_trigger.sql` — generated via `supabase migration new drop_display_name_from_profile_trigger`; contains `CREATE OR REPLACE FUNCTION public.handle_new_user()` that inserts only `(id, email, full_name, avatar_url)`, leaving `display_name` to default to NULL. Trigger binding is not recreated.
  - `supabase/tests/profiles_test.sql` — change the assertion from "display_name = full_name" to "display_name IS NULL", keep the `full_name` assertion intact.
- **Acceptance**:
  - [ ] After the migration runs, a fresh insert into `auth.users` with `raw_user_meta_data = {"full_name": "Test User"}` creates a `profiles` row where `display_name IS NULL` and `full_name = 'Test User'` (pgTAP)
  - [ ] Same insert with `raw_user_meta_data = {"name": "Jane Doe"}` → `full_name = 'Jane Doe'`, `display_name IS NULL` (fallback behaviour for `full_name` is untouched)
  - [ ] The trigger binding on `auth.users` remains active (no trigger-absence regression — verify via existing trigger-existence assertion in the pgTAP file, or add one if missing)
  - [ ] `bun run test:db` passes; no other pgTAP test regresses
- **Verification**:
  - `bun run test:db`

### Task 2: Onboarding schema + completeOnboarding server action

- **Covers**: Scenario 2 (partial — profile update on valid input), Scenario 3 (full — validation rules), Scenario 4 (partial — server-side idempotency of the `cohort_id` write)
- **Size**: M (4 files)
- **Dependencies**: Task 1 (the server action writes `display_name`; tests assume it starts NULL)
- **References**:
  - test-driven-development — RED first
  - supabase — `createClient()`, `profiles` update under RLS
  - `features/submit-project/api/schema.ts` — Zod pattern
  - `features/submit-project/api/actions.ts:29-51` — auth + profile pattern
  - `features/submit-project/api/actions.test.ts` — mock shape for `createClient` + `from()`
- **Implementation targets**:
  - `features/onboarding/api/schema.ts` — Zod `onboardingInputSchema` with `displayName` (trim, min 1, max 50) and `cohortId` (uuid)
  - `features/onboarding/api/schema.test.ts` — boundary cases
  - `features/onboarding/api/actions.ts` — `completeOnboarding(input)` server action returning `{ok, error?}`; rejects signed-out, validates input, writes `{display_name, cohort_id}` to own profile row
  - `features/onboarding/api/actions.test.ts` — signed-out, invalid input, RLS-own-profile happy path, DB error surface
- **Acceptance**:
  - [ ] Empty `displayName` → `{ok: false, error: "Display name is required"}` without touching the DB
  - [ ] Whitespace-only `displayName` ("   ") → same rejection after trim
  - [ ] `displayName` of 51 characters → `{ok: false, error: "Display name must be 50 characters or fewer"}`
  - [ ] Missing `cohortId` → `{ok: false, error: "Please select a cohort"}`
  - [ ] Signed-out caller → `{ok: false, error: /signed in/i}` without touching the profile
  - [ ] Signed-in caller with valid input → `profiles.update({display_name, cohort_id}).eq("id", user.id)` is called exactly once and `{ok: true}` returned
  - [ ] Input `displayName` is `"  Alice  "` → the value sent to `profiles.update` is exactly `"Alice"` (trimmed; the pre-existing OAuth-populated `display_name` on the row is overwritten, not merged) — covers scenario 2 criterion 4 (stored name matches onboarding input, not OAuth value)
  - [ ] Underlying update error from Supabase → error message propagated in `result.error`
- **Verification**:
  - `bun run test:unit -- features/onboarding`

### Task 3: Onboarding form UI + slice barrel

- **Covers**: Scenario 2 (happy path UI), Scenario 3 (inline error display), Scenario 5 (no-cohorts empty state)
- **Size**: M (3 files)
- **Dependencies**: Task 2 (imports `completeOnboarding`, `onboardingInputSchema`)
- **References**:
  - shadcn — compose with `Field`, `FieldLabel`, `FieldDescription`, `Input`, `Select` / `SelectTrigger` / `SelectItem`, `Button`, `Alert`, `Spinner` (all already in `shared/ui/`)
  - vercel-react-best-practices — `useTransition` for pending submit state
  - `features/submit-project/ui/submit-form.tsx` — form shape, `useId()` for label/input wiring, inline error rendering
  - `features/cohort-filter/ui/cohort-dropdown.tsx` — existing cohort `Select` usage (mind the Suspense lesson at `app/page.tsx:63`)
  - `artifacts/onboarding-process/wireframe.html` — layout (brand header → two fields → Continue → Sign out)
- **Implementation targets**:
  - `features/onboarding/ui/onboarding-form.tsx` — client component `OnboardingForm({cohorts, initialNext})`; manages `displayName`, selected `cohortId`, inline `displayNameError` / `cohortError`; calls `completeOnboarding`; on success `router.replace(initialNext)`; shows empty-state banner + disabled submit when `cohorts.length === 0`; always renders a sign-out control that calls `supabase.auth.signOut()` then `router.replace("/login")`
  - `features/onboarding/ui/onboarding-form.test.tsx` — render + interact (happy, each validation variant, no-cohorts, sign-out) with `completeOnboarding` mocked
  - `features/onboarding/index.ts` — barrel: `export { OnboardingForm } from "./ui/onboarding-form.tsx"`, `export { completeOnboarding } from "./api/actions.ts"`, plus schema/type re-exports
- **Acceptance**:
  - [ ] Render with 2+ cohorts → display name input, cohort `Select` (with options matching cohort names), enabled Continue button, visible Sign out control
  - [ ] Empty display name + click Continue → "Display name is required" text appears under the field, action not called
  - [ ] Display name "   " + click Continue → "Display name is required" (whitespace trimmed)
  - [ ] Display name of 51 chars + click Continue → "Display name must be 50 characters or fewer"
  - [ ] Cohort not selected + click Continue → "Please select a cohort"
  - [ ] Valid "Alice" + pick "Cohort A" + click Continue → `completeOnboarding({displayName: "Alice", cohortId: <uuid>})` called once and `router.replace(initialNext)` called
  - [ ] Empty `cohorts` prop → cohort selector is not rendered; visible notice "No cohorts are available yet. Please contact your instructor."; Continue button disabled; display name input **remains rendered and editable** (mirrors wireframe Screen 2) so the user can still pre-fill it while waiting for cohort seeding
  - [ ] Click "Sign out" → `supabase.auth.signOut()` called and router.replace("/login") invoked
  - [ ] Correcting one field after a validation error preserves previously entered valid values
- **Verification**:
  - `bun run test:unit -- features/onboarding`

### Checkpoint: After Tasks 1-3
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Trigger migration applied (`bun run test:db` green); `OnboardingForm` renders and submits correctly in isolation (via unit tests). Route and gate not yet wired.

---

### Task 4: `/onboarding` route + mirror-gate (onboarded user bounces away)

- **Covers**: Scenario 1 (partial — rendering onboarding when reached), Scenario 2 (partial — returning to `next` after submit), Scenario 4 (full — onboarded user hitting `/onboarding` is redirected away), Scenario 5 (full — page passes `[]` when no cohorts exist)
- **Size**: S (2 files)
- **Dependencies**: Task 3
- **References**:
  - next-best-practices — server component page, `redirect()` from `next/navigation`, searchParams as `Promise`, Suspense for the client child
  - `app/page.tsx:31-42` — profile read pattern
  - `app/auth/callback/route.ts:9-11` — `next` sanitization (`startsWith("/")`)
  - `features/cohort-filter/api/fetch-cohorts.ts` — reused cohort fetch
  - `shared/lib/test-utils.tsx:29-34` — `renderServerComponent` accepts `Promise<React.JSX.Element>`, which is what an async server component invocation returns; it already works for pages whose `searchParams` prop is a `Promise` — no helper extension needed
- **Implementation targets**:
  - `app/onboarding/page.tsx` — async server component; reads `searchParams.next` and sanitizes (`!next.startsWith("/") → "/"`); gets user (redirect to `/login` if signed out — defensive, middleware should cover); reads own profile; if `cohort_id` is set → `redirect(sanitized next)`; else fetches cohorts → renders `<Suspense><OnboardingForm cohorts={cohorts} initialNext={sanitized} /></Suspense>`
  - `app/onboarding/page.test.tsx` — `renderServerComponent` cases: onboarded user + `next=/foo` → `redirect("/foo")`; onboarded user + external `next=https://evil.com` → `redirect("/")`; un-onboarded user renders form with cohort list; zero cohorts → form renders with empty list
- **Acceptance**:
  - [ ] Signed-in user with `cohort_id` set visits `/onboarding` → `redirect("/")` called (no form render)
  - [ ] Signed-in user with `cohort_id` set visits `/onboarding?next=/some-page` → `redirect("/some-page")` called
  - [ ] Signed-in user with `cohort_id` set visits `/onboarding?next=https://evil.com` → `redirect("/")` called (sanitized)
  - [ ] Signed-in user with null `cohort_id` visits `/onboarding` → the `OnboardingForm` is rendered with the fetched cohort list
  - [ ] Signed-in user with null `cohort_id` visits `/onboarding?next=/somewhere` → the page renders the form with `initialNext="/somewhere"`; no redirect occurs (covers scenario 1 criterion 2 — no redirect loop when already on the onboarding route)
  - [ ] Zero cohorts exist → `OnboardingForm` receives `cohorts={[]}` (empty-state UI branch from Task 2 triggers)
  - [ ] Signed-out user visits `/onboarding` → `redirect("/login")` (defensive; middleware handles most cases)
- **Verification**:
  - `bun run test:unit -- app/onboarding`

### Task 5: Root `middleware.ts` — hard gate

- **Covers**: Scenario 1 (full — any authed route redirects to `/onboarding?next=<path>` when `cohort_id` is null), Scenario 6 (full — cohort-deleted user re-enters gate)
- **Size**: M (2 files)
- **Dependencies**: Task 4 (so the redirect target exists and behaves correctly)
- **References**:
  - next-best-practices — middleware matcher config, `NextResponse.redirect`, `NextRequest`
  - `shared/api/supabase/proxy.ts` — existing (currently orphaned) `updateSession` helper; the new `middleware.ts` is what finally wires it up
  - supabase — safe Supabase client construction in edge runtime
- **Interaction with `proxy.updateSession`**: `proxy.ts` exists but is **not called from anywhere today** (no `middleware.ts` in the repo yet). The new middleware absorbs its job: it constructs the server client once using the same cookie-wiring shape, calls `getUser()` (which refreshes the session automatically), and then runs the cohort check on the same client. There is **no second round-trip** — `updateSession`'s `getClaims()` call is replaced by the single `getUser()` + conditional `profiles.select` in the new middleware. `proxy.ts` stays untouched for now; a follow-up cleanup task can delete it once we confirm nothing imports it.
- **Implementation targets**:
  - `middleware.ts` — exports `middleware(request)` + `config.matcher`. The matcher excludes static assets and Next internals at the URL level so the Supabase client is never even constructed for them: `matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]`. API routes (`/api/*`) are likewise excluded if not already covered by the negative lookahead. Inside the function: create the supabase client, call `getUser()`; if no user → pass through. If user → select `profiles.cohort_id`; if null and path is not in the runtime allowlist (`/onboarding`, `/login`, `/auth/*`) → `NextResponse.redirect` to `/onboarding?next=<original path+search>`; otherwise pass through with session cookies forwarded on the response.
  - `middleware.test.ts` — unit tests with mocked `createServerClient`: unauth user → pass-through, authed + cohort set → pass-through, authed + cohort null on `/` → redirect to `/onboarding?next=/`, authed + cohort null on `/onboarding` → pass-through (loop-avoid), authed + cohort null on `/login` → pass-through
- **Acceptance**:
  - [ ] Unauthenticated visitor on `/` → middleware passes through (no redirect header)
  - [ ] Signed-in user with `cohort_id` set on `/` → middleware passes through
  - [ ] Signed-in user with null `cohort_id` on `/` → response is a redirect to `/onboarding?next=%2F`
  - [ ] Signed-in user with null `cohort_id` on `/anything?x=1` → redirect to `/onboarding?next=%2Fanything%3Fx%3D1`
  - [ ] Signed-in user with null `cohort_id` on `/onboarding` → pass-through (no loop)
  - [ ] Signed-in user with null `cohort_id` on `/login` → pass-through (can sign out / switch account)
  - [ ] Signed-in user with null `cohort_id` on `/auth/callback` → pass-through (auth completion must not be blocked)
  - [ ] After cohort deletion clears `cohort_id` (ON DELETE SET NULL), the same user is redirected to `/onboarding` on their next visit (simulated by mock returning null)
  - [ ] Requests to `/_next/static/*`, `/_next/image`, `/favicon.ico`, and `*.{png,jpg,jpeg,svg,webp,ico,gif}` do **not** enter the middleware function body (verified by asserting the matcher regex does not match those paths — guards against future matcher misconfiguration that would DDoS the DB)
  - [ ] Requests to `/api/*` do not trigger a `profiles.select` round-trip (either excluded by matcher, or — if included — pass-through without the cohort check)
- **Verification**:
  - `bun run test:unit -- middleware`
  - Manual: `bun run dev`, sign in a fresh user, confirm landing → bounce to `/onboarding`; complete form; confirm landing at home with submission form usable.

### Checkpoint: After Tasks 4-5
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] End-to-end manual check: new sign-in → onboarding → home with submission unblocked; previously onboarded user never sees `/onboarding`; direct navigation to `/onboarding` as onboarded user bounces to `/`.

---

### Task 6: Remove obsolete "Contact your instructor" UI from submit-project

- **Covers**: No new spec scenario. Implements the "Notes for Downstream Specs" section of `artifacts/onboarding-process/spec.md` (obsoletes `micro-hunt/spec.md` scenario 4).
- **Size**: S (3 files + 1 spec doc)
- **Dependencies**: Task 5 (the gate guarantees `cohortId` is non-null when the submission form renders)
- **References**:
  - `features/submit-project/ui/submit-form.tsx:37,98-106,184` — `blocked` state, Alert banner, disabled submit
  - `features/submit-project/ui/submit-form.test.tsx` — existing tests covering the banner
  - `features/submit-project/api/actions.ts:45-51` — defensive check (keep)
- **Implementation targets**:
  - `features/submit-project/ui/submit-form.tsx` — change `SubmitFormProps.cohortId` to `string` (non-null), remove `blocked` state, remove the `<Alert data-testid="submit-form-cohort-warning">` block, drop `blocked ||` from `disabled` props
  - `features/submit-project/ui/submit-form.test.tsx` — remove the cohort-warning test; keep all other coverage green
  - `app/page.tsx` — adjust `<SubmitForm cohortId={viewerCohortId} />`: the non-null assertion is only safe when the middleware has already gated. Because page.tsx also renders for anon users (who never see `<SubmitForm>` due to the `user ?` branch), `viewerCohortId` is guaranteed non-null in practice once the gate ships. Cast/assert at the prop site with a brief comment pointing at the middleware.
  - `artifacts/micro-hunt/spec.md` — strike scenario 4 (and any references in "Invariants" if present) with a one-line note: "Obsoleted by onboarding-process scenario 1 on <date>."
- **Acceptance**:
  - [ ] `SubmitForm` renders no "Cohort assignment needed" alert in any unit test case
  - [ ] Submit button is never disabled by the removed `blocked` condition (only by `submitting`)
  - [ ] `features/submit-project/api/actions.ts:45-51` defensive null check is unchanged (test still passes)
  - [ ] `artifacts/micro-hunt/spec.md` scenario 4 is removed or marked obsolete
  - [ ] Existing happy-path / validation / auth tests in `submit-form.test.tsx` and `actions.test.ts` remain green
- **Verification**:
  - `bun run test:unit -- features/submit-project`
  - `bun run test:unit -- app/page` (if page-level test exists)
  - `bun run build`

### Checkpoint: After Task 6 (final)
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Manual smoke: new-user path (sign in → onboarding → submit a project); onboarded-user path (sign in → submission form with no banner).

---

## Undecided Items

- None. Spec's `Undecided Items` is empty and this plan has no further open questions.
