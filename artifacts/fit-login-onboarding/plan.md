# fit-login-onboarding Implementation Plan

## Context

Today the `/login` and `/onboarding` screens share an outer flex-centered shell but diverge in the header block. Login uses the new `Logo` component (`> claude-hunt_` with blinking cursor, `text-3xl`) and a short subtitle paragraph. Onboarding still uses a plain `<span className="font-bold text-xl">Claude Hunt</span>`, an `<h1>`, and a different subtitle — a pre-logo layout that was never updated when the create-logo feature shipped. The two screens are the only surfaces a brand-new user sees before they can submit a project, and the brand mismatch makes them read as two disconnected screens instead of two steps of the same flow.

This feature brings both screens to a single `Logo → <h1> → subtitle` header pattern, shared via one `AuthLayout` component in `shared/ui/`, while leaving all form behavior (validation, auth, onboarding persistence, sign-out, redirect gates) untouched. The spec's **Single source of header truth** invariant is enforced by the shared component: future changes to the Logo size, heading font, or spacing rhythm update both screens together.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Where the unified layout lives | `shared/ui/auth-layout.tsx` (new) | Two sibling feature slices (`features/auth-login`, `features/onboarding`) must not import sideways; shared UI goes in `shared/` per CLAUDE.md FSD rules. `widgets/` is for multi-page composed blocks — overkill for a 2-screen shell. |
| API shape | Single `<AuthLayout title description>{children}</AuthLayout>` component | One component enforces the "Single source of header truth" invariant more strongly than two composable primitives (`AuthShell` + `AuthHeader`), and hides the shell/max-width/spacing decisions from callers. |
| Blink behavior | `AuthLayout` always passes `blink` to `Logo` | Spec Invariant: "Motion never differs between these two screens." No per-caller `blink` prop needed. |
| Spacing rhythm | `mt-8` Logo→h1, `mt-1` h1→subtitle, `mt-8` header→children, `gap-2` label→input, `gap-6` between form sections | Matches the tight-loose-tight rhythm from the wireframe. Login's existing `mt-2` under the subtitle (legacy) is replaced by `mt-1` for a tighter h1+subtitle pair. |
| h1 copy | Login: "Welcome back" · Onboarding: "Set up your profile" | From wireframe. Shortens onboarding's current "Welcome! Let's set up your profile" (the "Welcome!" was redundant next to the Logo). |
| Scope of `AuthLayout` adoption | Only `/login` and `/onboarding` | Spec excludes other auth routes (`/auth/auth-code-error`) from this change. |
| Blink keyframe | Re-use existing `logo-cursor-blink` keyframe in `app/globals.css` | Already shipped by create-logo; `Logo` component already applies it via inline style when `blink` is true. No CSS change needed. |
| Supersession of create-logo invariant | Amend `artifacts/create-logo/spec.md` Invariants section | The "Motion restraint — blink is login-only" invariant contradicts this feature; must be updated in the same change per write-spec skill rule ("Do not create ambiguity that contradicts existing spec"). |

## Infrastructure Resources

None.

## Data Model

None. No DB, API, or persistence changes.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | Task 1, 2, 3 | RED → GREEN discipline; each Success Criterion gets one test at the lowest provable boundary. Colocated `*.test.tsx` per CLAUDE.md Testing section. |
| frontend-ui-engineering | Task 1, 2, 3 | Building production-quality UI; applies the visual hierarchy/rhythm from the wireframe. |
| fsd | Task 1 | Slice placement (`shared/ui/` for cross-feature UI primitives; no sideways imports). |
| shadcn | Task 1, 2, 3 | shadcn-guard rule: do not edit `components/ui/*`; do not override default styles with className. `AuthLayout` composes `Logo` (which is in `shared/ui/`, not shadcn) and layout classes only. |
| vercel-composition-patterns | Task 1 | `children` slot pattern for the form body; single-responsibility component with a small prop surface. |
| web-design-guidelines | Task 1 | One `<h1>` per page; correct heading hierarchy; keep the Logo's `aria-label="claude-hunt home"` link. |
| next-best-practices | Task 2, 3 | `features/` contains client components; `app/<route>/page.tsx` stays as thin server/client wrapper. No RSC/RCC boundary changes. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `shared/ui/auth-layout.tsx` | New | Task 1 |
| `shared/ui/auth-layout.test.tsx` | New | Task 1 |
| `features/auth-login/ui/login-form.tsx` | Modify | Task 2 |
| `features/auth-login/ui/login-form.test.tsx` | Modify | Task 2 |
| `features/onboarding/ui/onboarding-form.tsx` | Modify | Task 3 |
| `features/onboarding/ui/onboarding-form.test.tsx` | Modify | Task 3 |
| `artifacts/create-logo/spec.md` | Modify | Task 4 |

## Tasks

### Task 1: Introduce `AuthLayout` in `shared/ui/`

- **Covers**: Scenario 3 (partial — shell), Scenario 4 (partial — header rhythm). Full coverage of these two scenarios is only achieved after Task 2 & 3 adopt the component.
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - skill `test-driven-development` — keywords: criterion-to-test mapping, colocated .test.tsx
  - skill `fsd` — keywords: shared/ui, no sideways imports
  - skill `shadcn` — keywords: do not override component styles
  - skill `web-design-guidelines` — keywords: single h1, heading hierarchy
  - `shared/ui/logo.tsx` (reuse — `blink` prop; `className="text-3xl"` pattern)
  - `shared/ui/logo.test.tsx` (reference for test style in `shared/ui/`)
  - `app/globals.css:131-140` (existing `@keyframes logo-cursor-blink`; no change)
- **Implementation targets**:
  - `shared/ui/auth-layout.tsx` — `AuthLayout({ title, description, children })`: renders `<section class="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent"><div class="w-full max-w-sm"><div><Logo blink className="text-3xl" /><h1 class="mt-8 text-2xl font-semibold tracking-tight">{title}</h1><p class="mt-1 text-muted-foreground text-sm">{description}</p></div><div class="mt-8">{children}</div></div></section>`
  - `shared/ui/auth-layout.test.tsx` — colocated Vitest + RTL test
- **Acceptance**:
  - [ ] Rendering with `title="T"` `description="D"` produces exactly one `<h1>` with text "T"
  - [ ] Rendering produces a `<p>` with text "D" after the `<h1>` in DOM order
  - [ ] The `Logo` link with `aria-label="claude-hunt home"` appears before the `<h1>` in DOM order
  - [ ] The Logo's trailing `_` span has inline style `animationName === "logo-cursor-blink"` and `animationDuration === "1s"` (blink is always on)
  - [ ] Arbitrary `children` are rendered below the subtitle (assert a test sentinel element is present)
  - [ ] The outer section element carries the classes `flex`, `min-h-screen`, `items-center`, `justify-center`, `bg-zinc-50`, `px-4`, `py-16`, `md:py-32`, `dark:bg-transparent` (token stability for Scenario 3)
- **Verification**:
  - `bun run test:unit shared/ui/auth-layout.test.tsx`
  - `bun run build`

---

### Task 2: Adopt `AuthLayout` on `/login`

- **Covers**: Scenario 1 (full), Scenario 3 (partial — login side), Scenario 4 (partial — login side), Scenario 5 (partial — auth spec regression guard).
- **Size**: S (2 files)
- **Dependencies**: Task 1 (AuthLayout must exist)
- **References**:
  - skill `test-driven-development` — keywords: regression guard, real component boundary
  - skill `next-best-practices` — keywords: `"use client"` boundary, features-layer location
  - `features/auth-login/ui/login-form.tsx` (current implementation — preserve all `onSubmit`, state, and button behavior; only swap the outer `<section>` + form header markup)
  - `features/auth-login/ui/login-form.test.tsx` (existing tests — most stay unchanged; see Acceptance for additions)
  - `artifacts/auth/spec.md` (scenarios 1–4, 13, 14 for regression coverage)
- **Implementation targets**:
  - Replace `<section class="...">` wrapper with `<AuthLayout title="Welcome back" description="Sign in to your account to continue">`
  - Remove the inline `Logo` render and `<p class="mt-2 ...">` subtitle (now provided by `AuthLayout`)
  - Drop `w-full max-w-sm` from the `<form>` — the max-width container is now the `AuthLayout` inner div
  - Remove `mt-6` from the OAuth buttons grid (AuthLayout provides `mt-8` header→children gap)
  - Keep: OAuth buttons, separator, email field, OTP-sent branch, terms footer, all onSubmit / state / disabled logic exactly as today
- **Acceptance**:
  - [ ] `/login` renders exactly one `<h1>` with text "Welcome back" (new)
  - [ ] `/login` renders a `<p>` with text "Sign in to your account to continue" after the `<h1>` (new)
  - [ ] The Logo link (`aria-label="claude-hunt home"`) remains present and precedes the `<h1>` in DOM order (preserved)
  - [ ] The Logo's underscore cursor animates with `animationName === "logo-cursor-blink"` (preserved — existing test unchanged)
  - [ ] The legacy string "Claude Hunt" does not appear in `/login` rendered text (preserved — existing test unchanged)
  - [ ] Typing `test@example.com` and clicking "Continue" still shows "We sent a magic link to test@example.com. Check your email to sign in." (regression — auth spec scenario 1)
  - [ ] "Try another email" still resets the email input to empty and hides the OTP confirmation (regression — auth spec scenario 2)
  - [ ] While loading, GitHub/Google/email-input/Continue are all disabled (regression — auth spec scenario 3)
  - [ ] Clicking GitHub calls `signInWithOAuth` with `provider: "github"` and `options.redirectTo` ending in `/auth/callback` (regression — auth spec scenario 13)
  - [ ] Clicking Google calls `signInWithOAuth` with `provider: "google"` and `options.redirectTo` ending in `/auth/callback` (regression — auth spec scenario 13)
  - [ ] On OTP error, the email form stays visible and inputs re-enable (regression — auth spec scenario 14)
  - [ ] On OAuth error, GitHub and Google buttons re-enable (regression — auth spec scenario 14)
  - [ ] The rendered `/login` page contains exactly one link with `aria-label="claude-hunt home"` — no second Logo appears after adoption (Invariant: One Logo per screen)
  - [ ] The rendered `/login` page still carries `bg-zinc-50` and `dark:bg-transparent` on its outer section and `py-16 md:py-32` vertical padding — these classes must come from `AuthLayout` and not be overridden by a caller wrapper (Scenario 3)
- **Verification**:
  - `bun run test:unit features/auth-login/ui/login-form.test.tsx`
  - `bun run build`

---

### Task 3: Adopt `AuthLayout` on `/onboarding`

- **Covers**: Scenario 2 (full), Scenario 3 (partial — onboarding side, completes Scenario 3 full coverage), Scenario 4 (partial — onboarding side, completes Scenario 4 full coverage), Scenario 5 (partial — onboarding spec regression guard).
- **Size**: S (2 files)
- **Dependencies**: Task 1 (AuthLayout must exist). Independent of Task 2.
- **References**:
  - skill `test-driven-development` — keywords: criterion-to-test mapping
  - skill `next-best-practices` — keywords: `"use client"` boundary
  - `features/onboarding/ui/onboarding-form.tsx` (current implementation — preserve all validate/submit/signOut behavior)
  - `features/onboarding/ui/onboarding-form.test.tsx` (existing tests — all stay; new assertions added)
  - `artifacts/onboarding-process/spec.md` (scenarios 1–6 for regression coverage)
- **Implementation targets**:
  - Replace `<section class="...">` wrapper with `<AuthLayout title="Set up your profile" description="Pick a cohort and set your display name to start submitting projects.">`
  - Delete the inline `<span className="font-bold text-xl">Claude Hunt</span>`, the old `<h1>` ("Welcome! Let's set up your profile"), and its subtitle `<p>` — all now provided by `AuthLayout`
  - Drop `w-full max-w-sm` from the `<form className="flex flex-col gap-6 ...">` — max-width now provided by AuthLayout
  - Keep: `FieldGroup`, `Field`, display-name input + validation, cohort select, no-cohorts `Alert`, Continue submit, separator, Sign out button, all `completeOnboarding`/`signOut`/`router.replace` behavior
- **Acceptance**:
  - [ ] `/onboarding` renders exactly one `<h1>` with text "Set up your profile" (new)
  - [ ] `/onboarding` renders a `<p>` with text "Pick a cohort and set your display name to start submitting projects." after the `<h1>` (new)
  - [ ] The Logo link (`aria-label="claude-hunt home"`) is present and precedes the `<h1>` in DOM order (new)
  - [ ] The legacy plain-text "Claude Hunt" `<span>` is no longer present in `/onboarding` rendered text (new)
  - [ ] The Logo's underscore cursor animates with `animationName === "logo-cursor-blink"` on `/onboarding` (new — supersedes create-logo's login-only invariant)
  - [ ] Display name input, cohort selector, Continue submit button, and Sign out button still render in that DOM order (regression — onboarding spec scenarios 2, 3)
  - [ ] Empty display name on submit still shows "Display name is required" (regression — onboarding spec scenario 3)
  - [ ] Whitespace-only display name on submit still shows "Display name is required" (regression — onboarding spec scenario 3)
  - [ ] Display name > 50 chars still shows "Display name must be 50 characters or fewer" (regression — onboarding spec scenario 3)
  - [ ] No cohort picked still shows "Please select a cohort" (regression — onboarding spec scenario 3)
  - [ ] Valid submit still calls `completeOnboarding({ displayName, cohortId })` and `router.replace(initialNext)` (regression — onboarding spec scenario 2)
  - [ ] Empty cohorts list still hides the cohort selector, shows the "No cohorts are available yet" alert, and disables Continue (regression — onboarding spec scenario 5)
  - [ ] Sign out button still calls `supabase.auth.signOut()` and `router.replace("/login")` (regression — onboarding spec scenario 5, 6)
  - [ ] The rendered `/onboarding` page contains exactly one link with `aria-label="claude-hunt home"` — no second Logo appears after adoption (Invariant: One Logo per screen)
  - [ ] The rendered `/onboarding` page still carries `bg-zinc-50` and `dark:bg-transparent` on its outer section and `py-16 md:py-32` vertical padding — these classes must come from `AuthLayout` and not be overridden by a caller wrapper (Scenario 3)
- **Verification**:
  - `bun run test:unit features/onboarding/ui/onboarding-form.test.tsx`
  - `bun run build`

---

### Checkpoint: After Tasks 1–3
- [ ] All Vitest tests pass: `bun run test:unit`
- [ ] Build succeeds: `bun run build`
- [ ] Dev server renders `/login` and `/onboarding` with identical shell and header rhythm (manual visual check — matches `artifacts/fit-login-onboarding/wireframe.html` "Side-by-side" screen)
- [ ] The existing E2E happy path still passes: `bun run test:e2e e2e/auth/signup-to-main.spec.ts` (no changes expected; it does not assert on headers)
- [ ] Redirect-gate non-regression (Scenario 5 Success Criterion 3) verified by the full E2E suite: `bun run test:e2e` — confirms that `/login`, `/onboarding`, and `/auth/callback` continue to route signed-in / signed-out / onboarded / not-onboarded users to the correct destinations. No redirect code is touched by this plan; the suite is the regression net.

---

### Task 4: Update `artifacts/create-logo/spec.md` to remove superseded motion invariant

- **Covers**: Scenario 5 (partial — documentation consistency). Removes the contradiction the spec flagged in its "Notes for Downstream Specs" section, which is a precondition for Task 3's "blink on /onboarding" acceptance bullet to be unambiguous under the project's documented invariants.
- **Size**: S (1 file)
- **Dependencies**: Tasks 1–3 (the supersession is only accurate once the code ships the new behavior)
- **References**:
  - `artifacts/create-logo/spec.md` (Invariants → "Motion restraint" — the line to update)
  - `artifacts/fit-login-onboarding/spec.md` (Notes for Downstream Specs — the supersession note)
- **Implementation targets**:
  - In `artifacts/create-logo/spec.md`, replace the `Motion restraint` invariant with a note that the blinking cursor now appears on every screen that shows the Logo as the page hero (currently `/login` and `/onboarding`), cross-referencing `artifacts/fit-login-onboarding/spec.md`
- **Acceptance**:
  - [ ] `artifacts/create-logo/spec.md` no longer claims the blinking cursor is confined to the login hero
  - [ ] `artifacts/create-logo/spec.md` contains a cross-reference to `artifacts/fit-login-onboarding/spec.md` for the updated motion policy
- **Verification**:
  - Manual diff review — no tests; docs-only.

---

### Checkpoint: After Task 4
- [ ] `artifacts/create-logo/spec.md` and `artifacts/fit-login-onboarding/spec.md` no longer contradict each other
- [ ] Commit message references both feature folders

---

## End-to-End Verification

Before merging:

1. `bun run test` — Vitest + pgTAP (no DB changes expected, but smoke-test)
2. `bun run test:e2e e2e/auth/signup-to-main.spec.ts` — confirms the magic-link flow still works after markup changes
3. `bun run build` — ensures no TS / Next.js type errors
4. Manual browser check at `http://localhost:3000/login` and `http://localhost:3000/onboarding`:
   - Same background, same centering, same form width
   - Same header rhythm (Logo at `text-3xl`, `h1` at `text-2xl`, `mt-8` gap Logo→h1, `mt-1` gap h1→subtitle, `mt-8` gap header→form)
   - Underscore cursor blinks on both at the same 1s cadence
   - Resize to 320px wide and 1440px wide; both screens adapt identically
   - Toggle theme (press `d`); both screens preserve the unified look in dark mode

## Undecided Items

None.
