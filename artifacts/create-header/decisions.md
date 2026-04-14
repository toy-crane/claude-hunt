# decisions — create-header

## Reviewer selection

**When**: Step 2, Reviewer selection
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer` in parallel after all tasks complete.
**Why**: Feature ships UI changes (Header widget + Settings page + Project Board relayout). A wireframe exists, so `wireframe-reviewer` applies. `ui-quality-reviewer` covers layout quality; `design-reviewer` validates shadcn token usage; `react-reviewer` validates Next.js / RSC boundaries and Vercel React best practices (Header is RSC composing a client island, server actions, `revalidatePath`).
**Harness Signal**: N/A
**Result**: Pending

## Reviewer feedback — accepted fixes

**When**: Step 5, Evaluation loop
**Decision**: Accepted every FAIL and most Warning items from the four reviewers; rejected advisories that conflicted with user-approved design choices:

Accepted (fixed):
- **react-reviewer FAIL (`app/page.tsx`)**: duplicate `getUser()` + profile calls between Page and Header. Introduced `shared/api/supabase/viewer.ts` — a `cache()`-wrapped `fetchViewer()` that fetches user + profile once per request. Home page, Settings page, and Header all delegate to it. Halves the Supabase round-trips on `/`.
- **design-reviewer FAIL (`settings-form.tsx`)**: `Field` missing `data-invalid` and `data-disabled`. Added both. Also moved the Save button out of `FieldGroup` so it isn't semantically nested inside a field container.
- **design-reviewer notes**: removed `size-4` override on the fallback icon; added `data-icon="inline-start"` on the settings Log-out icon.
- **ui-quality-reviewer Warning**: SubmitDialog stretched edge-to-edge on mobile. Wrapped in a `w-fit self-start` container.

Rejected (logged):
- **react-reviewer advisory (`LoginForm` Suspense)**: call site already wraps `<LoginForm />` in `<Suspense>` at `app/login/page.tsx`. Moving the boundary inside the component is defensive against future re-use but not required. Not changed.
- **ui-quality advisory — filter label right-aligned / Log in button variant**: the user explicitly approved this layout during the wireframe iteration (separator above filter, right-aligned filter). Holding the line per approved design.
- **ui-quality advisory — no Header on /settings**: spec scope is "home only this round". Intentional.

**Why**: FAIL-tier items are non-negotiable — duplicate network calls and missing form-state data attributes both degrade real user experience. Advisory items clash with approved wireframe choices; changing them would undo work the user signed off on.
**Harness Signal**: When RSC + client-island pairs both need session data, the default instinct should be "cache the fetch helper" rather than "fetch twice". A plan-reviewer check would be: "if multiple server components in the same tree call `getUser()`, flag it and propose `React.cache()` or prop drilling." Worth adding to the plan-reviewer prompt.
**Result**: Pending — re-running react-reviewer and design-reviewer after the fixes.

## LoginForm now honors `?next=<path>`

**When**: Step 4, Task 7
**Decision**: Teach `features/auth-login/ui/login-form.tsx` to read `next` from `useSearchParams()` and append it to the OAuth `redirectTo` / OTP `emailRedirectTo` as `?next=<path>`. Wrap `<LoginForm />` in a `<Suspense>` boundary at `app/login/page.tsx` so Next.js' CSR bailout doesn't fail the build.
**Why**: Scenario-4 Success Criterion "After signing in from that redirect, visitor lands on `/settings`" requires the magic-link callback to know where to send the user. The callback at `app/auth/callback/route.ts` already honors `next`, but the login form was stripping it. Fixing it inside this feature keeps the spec-level criterion testable via Playwright, which was the whole point of the `?next=/settings` redirect chain.
**Harness Signal**: `/draft-plan` exploration noticed the callback handled `next` but missed that the login form discarded it before emitting the email. A plan-reviewer check could cross-reference spec redirect flows against the login form's handling of query params. Worth flagging as a reviewer prompt: "every redirect chain in the spec must have a provably symmetric reverse path."
**Result**: Pending — Playwright covers this end-to-end; Vitest covers form mock wiring.

## Task execution order

**When**: Step 3, Task ordering
**Decision**: Execute in plan order (1 → 2 → 3 → 4 → 5 → Checkpoint 1 → 6 → 7 → 8a → 8b → 9 → Checkpoint 2 → 10). One commit per task.
**Why**: plan.md's tasks are already dependency-ordered. Task 1 (shadcn install) must precede anything that renders `<Avatar>` / `<DropdownMenu>`. Task 2 establishes `<Header />` scaffold that Task 3 extends. Task 4 and Task 5 both close scenario-3 but are independent (dropdown theme vs. hotkey removal) — Task 4 first because it delivers user-visible behavior; Task 5 is cleanup. Task 6 extends the dropdown once Task 4's scaffold exists. Task 7 creates the `/settings` shell that Task 8b/Task 9 modify. Task 10 is last by design (Risk flagged in plan review: keeping Task 2 minimal avoids merge conflicts with Task 10's relayout).
**Harness Signal**: N/A
**Result**: Pending
