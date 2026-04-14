# Plan — create-header

## Context

The home page today renders an inline page-level "header" (title + description + cohort filter + Submit) and has no persistent account surface. Signed-in state is invisible, there's no way to reach user preferences, and theme switching lives behind an undocumented `d` hotkey.

This feature introduces a reusable **site header widget** (mounted on `/` only this round), a new **`/settings` route** where a signed-in user can edit their display name and log out, and **relayouts the Project Board section** so Submit sits top-right of the title row with the cohort filter right-aligned below a horizontal separator. The `d` hotkey is removed since the avatar dropdown is now the single theme-switching surface.

Inputs:
- Spec: `artifacts/create-header/spec.md` (6 scenarios + invariants)
- Wireframe: `artifacts/create-header/wireframe.html` (4 screens — signed-out, signed-in, menu open, settings)

## Affected Files

| Path | Change |
|---|---|
| `shared/ui/dropdown-menu.tsx` | NEW — shadcn `add dropdown-menu` |
| `shared/ui/avatar.tsx` | NEW — shadcn `add avatar` |
| `widgets/header/index.ts` | NEW — public API: `export { Header }` |
| `widgets/header/ui/header.tsx` | NEW — async RSC; fetches user + profile |
| `widgets/header/ui/header.test.tsx` | NEW — RSC test (mocked supabase) |
| `widgets/header/ui/header-menu.tsx` | NEW — `"use client"` avatar + dropdown |
| `widgets/header/ui/header-menu.test.tsx` | NEW — interaction tests |
| `features/settings/index.ts` | NEW — `export { SettingsForm, updateDisplayName }` |
| `features/settings/api/schema.ts` | NEW — re-export / wrap onboarding's `displayName` schema |
| `features/settings/api/actions.ts` | NEW — `updateDisplayName` server action |
| `features/settings/api/actions.test.ts` | NEW |
| `features/settings/ui/settings-form.tsx` | NEW — `"use client"` form with toast |
| `features/settings/ui/settings-form.test.tsx` | NEW |
| `app/settings/page.tsx` | NEW — auth gate + compose SettingsForm + logout |
| `app/settings/page.test.tsx` | NEW |
| `core/providers/theme-provider.tsx` | MOD — remove `ThemeHotkey` and its mount |
| `core/providers/theme-provider.test.tsx` | MOD — drop hotkey assertions; keep provider composition coverage |
| `app/page.tsx` | MOD — mount `<Header />`; relayout Project Board section (Submit on title row, separator, right-aligned filter above grid) |
| `features/auth-login/api/actions.ts` | REUSE — existing `signOut()` server action |
| `features/onboarding/api/schema.ts` | REUSE — existing `displayName` zod rules |

## Skills

| Skill | Why |
|---|---|
| `test-driven-development` | Every task writes failing tests first. Each Success Criterion maps 1:1 to a test. |
| `frontend-ui-engineering` | Widget composition, keyboard interactions, a11y for dropdowns |
| `fsd` | Header is a widget (composes entities + shared + features); settings is a feature |
| `shadcn` | New `dropdown-menu` + `avatar` install and usage |
| `next-best-practices` | RSC / client boundary; route-group free; server actions |
| `api-and-interface-design` | Shape of `updateDisplayName` action and widget public API |
| `security-and-hardening` | Auth gate on `/settings`; never render avatar menu for signed-out |
| `vercel-react-best-practices` | Keep Header async RSC; isolate client island to menu + form |

## Key Reuse Decisions

- **Display-name validation**: import `onboardingInputSchema.shape.displayName` (or `MAX_DISPLAY_NAME_LENGTH`) from `@features/onboarding` instead of duplicating zod rules. Onboarding message strings stay authoritative.
- **Logout**: call the existing server action `signOut` from `@features/auth-login` in both the dropdown item and the Settings page button. Action already does `supabase.auth.signOut()` then `redirect("/")`.
- **Toast feedback**: `import { toast } from "sonner"` — matches `features/submit-project/ui/submit-dialog.tsx:41` pattern. `<Toaster />` is already mounted in `app/layout.tsx`.
- **Login `?next` flow**: auth callback at `app/auth/callback/route.ts` already honors `next`. `/settings` redirects signed-out visitors to `/login?next=/settings`.
- **Logo**: reuse `shared/ui/logo.tsx` (already links to `/`, supports `blink` prop — pass nothing; static in header).
- **Profile type**: `@entities/profile` exports `Profile` = `Tables<"profiles">` — fields `display_name`, `email`, `avatar_url`, `cohort_id`. No profile read helper exists; Header fetches inline (same pattern as `app/page.tsx:38-42`), and a small `fetchViewerProfile` helper may graduate later.

## Tasks

---

### Task 1 — Install shadcn `dropdown-menu` and `avatar` (S, prerequisite)

**Covers**: prerequisite — no scenario directly.

**Steps**:
1. `bunx shadcn@latest add dropdown-menu avatar`
2. Verify both files appear at `shared/ui/dropdown-menu.tsx` and `shared/ui/avatar.tsx` with the aliased imports.

**Acceptance**:
- [ ] `shared/ui/dropdown-menu.tsx` and `shared/ui/avatar.tsx` exist as standard shadcn components
- [ ] `bun run build` passes (no stale imports)

---

### Task 2 — Header widget: signed-out state, mounted on `/` (M)

**Covers**: scenario-1 (full).

**Files**:
- NEW `widgets/header/index.ts`, `widgets/header/ui/header.tsx`, `widgets/header/ui/header.test.tsx`
- MOD `app/page.tsx` — render `<Header />` above the existing inline section (layout relayout is Task 10)

**Steps**:
1. Write `header.test.tsx` first (RSC, mocked supabase with `{ user: null }`) asserting logo + Log in button + no avatar.
2. Implement `header.tsx` (async): fetch user via `createClient()` from `@shared/api/supabase/server.ts`; return a header bar with `<Logo />` (left) and a Log in button linking to `/login` (right). No avatar branch yet.
3. Export `{ Header }` from `widgets/header/index.ts`.
4. Mount in `app/page.tsx` at the top of `<main>`. **Do not touch the existing Project Board section JSX in this task** — the relayout is Task 10. Only add the Header element above the inline section.

**Acceptance**:
- [ ] `claude-hunt` logo in the header links to `/`
- [ ] A "Log in" button is rendered; clicking it navigates to `/login`
- [ ] No avatar element is rendered
- [ ] Clicking Submit (still inline) while signed out continues to trigger the existing sign-in prompt (behavior unchanged)

---

### Task 3 — Header avatar for signed-in users, no dropdown yet (S)

**Covers**: scenario-2 (partial — avatar renders correctly; dropdown content follows in Tasks 4+6).

**Files**:
- MOD `widgets/header/ui/header.tsx`, `widgets/header/ui/header.test.tsx`
- NEW `widgets/header/ui/header-menu.tsx` (`"use client"`, renders just the avatar trigger + empty/placeholder menu shell for now)
- NEW `widgets/header/ui/header-menu.test.tsx`

**Steps**:
1. Test first: mock supabase to return a user with a profile row `{ display_name: "Alice" }` → expect avatar button with text "A", no Log in button. Also: `{ display_name: null }` → generic user icon; `{ display_name: "  " }` trimmed same as null.
2. In `header.tsx`, when `user` exists, read the profile (`display_name`) via `from("profiles").select("display_name").eq("id", user.id).single()` and pass `displayName` into `<HeaderMenu />`.
3. `header-menu.tsx` renders shadcn `<Avatar>` wrapped in `<DropdownMenuTrigger>` with an empty `<DropdownMenuContent />` placeholder (to keep the widget usable).

**Acceptance**:
- [ ] Avatar button visible when signed in; Log in button not rendered
- [ ] Avatar shows the first character of display name (uppercase) when no avatar image is set
- [ ] Avatar shows a generic user icon when display name is missing or whitespace
- [ ] Exactly one of Log in button / avatar button is rendered (invariant check)

---

### Task 4 — Dropdown: Theme section (Light / Dark / System) (M)

**Covers**: scenario-3 (partial — all success criteria except the `d`-hotkey removal).

**Files**:
- MOD `widgets/header/ui/header-menu.tsx`, `widgets/header/ui/header-menu.test.tsx`

**Steps**:
1. Test first (`@testing-library/react` + user-event): open dropdown → expect "Theme" label and three `<DropdownMenuRadioItem>` ("Light", "Dark", "System"); click each → `setTheme` called with correct value; current theme indicated with a check; Escape and outside click close the menu.
2. Implement with `useTheme()` from `next-themes`. Use `<DropdownMenuLabel>Theme</DropdownMenuLabel>` + `<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>` with three radio items. Icons: `Sun`, `Moon`, `Monitor` from `lucide-react`.
3. Apply shadcn ring/focus defaults; no custom `className` overrides per `shadcn-guard.md`.

**Acceptance**:
- [ ] "Theme" label appears above the three items, visually grouped
- [ ] Selecting "Dark" switches `<html>` to the dark class; "Light" switches it off; "System" follows OS
- [ ] Active theme has a check mark (or equivalent) next to its item
- [ ] Reload preserves the selection (next-themes localStorage default)
- [ ] Clicking outside or pressing Escape closes the menu

---

### Task 5 — Remove the `d` keyboard shortcut (S)

**Covers**: scenario-3 (final success criterion — `d` no longer toggles theme).

**Files**:
- MOD `core/providers/theme-provider.tsx` — delete `ThemeHotkey` component and its mount
- MOD `core/providers/theme-provider.test.tsx` — drop the three hotkey-focused assertions; keep a minimal test that `ThemeProvider` forwards to `NextThemesProvider` with the expected defaults

**Acceptance**:
- [ ] Pressing the `d` key anywhere in the app no longer changes the theme
- [ ] `theme-provider.tsx` no longer defines or mounts `ThemeHotkey`
- [ ] Test file compiles with updated assertions; no dead `mockResolvedTheme` / keyboard fixtures

---

### ✅ Checkpoint 1 — after Tasks 1–5

Verify: `bun run test` green; `bun run build` clean; load `/` in browser signed out and signed in (use a seeded test account) → header shows correct state; open the dropdown, switch theme, press `d` → theme unchanged.

---

### Task 6 — Dropdown: Settings link + Log out item (S)

**Covers**: scenario-2 (final — the dropdown's full item order and content); scenario-4 (partial — menu → navigation); scenario-6 (partial — dropdown trigger).

**Files**:
- MOD `widgets/header/ui/header-menu.tsx`, `widgets/header/ui/header-menu.test.tsx`

**Steps**:
1. Test first: after the Theme radio group, expect a `<DropdownMenuSeparator>`, then a `<DropdownMenuItem>` "Settings" (asChild `<Link href="/settings">`), then a `<DropdownMenuItem>` "Log out" whose click calls the `signOut` server action.
2. Import `signOut` from `@features/auth-login`. For the menu item, render a `<form action={signOut}>` wrapping the item so it submits as a server action (or a client handler invoking the action).
3. Keep the menu as an accessible list (roles/keys already handled by shadcn).

**Acceptance**:
- [ ] Dropdown renders in the order: Theme label → Light / Dark / System → separator → Settings → Log out (verifies scenario-2 criterion on full item order)
- [ ] Dropdown contains "Settings" after the Theme section with a visible separator
- [ ] Clicking "Settings" navigates to `/settings`
- [ ] "Log out" item appears at the bottom; clicking it invokes `signOut()`
- [ ] After "Log out" is invoked, the user lands on `/` as signed-out (header re-renders with the Log in button)

---

### Task 7 — `/settings` page: shell + profile display (M)

**Covers**: scenario-4 (full).

**Files**:
- NEW `app/settings/page.tsx`, `app/settings/page.test.tsx`
- NEW `features/settings/index.ts`, `features/settings/ui/settings-form.tsx`, `features/settings/ui/settings-form.test.tsx`
- NEW `e2e/settings-auth-redirect.spec.ts` (Playwright) — covers the `?next=/settings` round-trip

**Steps**:
1. `page.test.tsx` first: unauthenticated visit → `redirect("/login?next=/settings")`; authenticated visit → heading "Settings", input pre-filled with `display_name`, email shown read-only, "Back to home" link to `/`.
2. `page.tsx` (RSC): await `supabase.auth.getUser()`; if no user → `redirect("/login?next=/settings")`; fetch `display_name, email` from `profiles`; render `<SettingsForm initialDisplayName={...} email={...} />` and a `<Link href="/">Back to home</Link>`.
3. `settings-form.tsx` (`"use client"`): form with a controlled display-name input + Save button (wired in Task 8 — no-op here) and a disabled email input labelled read-only.
4. Playwright `settings-auth-redirect.spec.ts`: unauthenticated visit to `/settings` → lands on `/login?next=/settings`; sign in via magic link (reuse `fetchMagicLink` helper per agent report); verify the final URL is `/settings`.

**Acceptance**:
- [ ] Heading "Settings" renders on `/settings`
- [ ] Display-name input is pre-filled with the current display name
- [ ] Email input is shown, disabled, clearly labelled read-only
- [ ] "Back to home" link returns to `/`
- [ ] Visiting `/settings` signed out redirects to `/login?next=/settings` (unit-tested in `page.test.tsx`)
- [ ] After completing sign-in from that redirect, visitor lands on `/settings` (end-to-end assertion in `settings-auth-redirect.spec.ts` using the magic-link helper)

---

### Task 8a — `updateDisplayName` server action + schema (S)

**Covers**: scenario-5 (partial — validation + persistence, without UI wiring).

**Files**:
- NEW `features/settings/api/schema.ts`, `features/settings/api/actions.ts`, `features/settings/api/actions.test.ts`

**Steps**:
1. `schema.ts`: `export const displayNameSchema = onboardingInputSchema.shape.displayName;` — re-export from onboarding to avoid drift.
2. `actions.ts`: `"use server"` — `updateDisplayName(raw)` validates via `displayNameSchema.safeParse`, returns `{ error: { field, message } }` on failure; on success calls `supabase.from("profiles").update({ display_name }).eq("id", user.id)` and `revalidatePath("/")` + `revalidatePath("/settings")`. Returns `{ ok: true }` on success.
3. `actions.test.ts`: empty / whitespace-only / >50-char inputs → each returns the expected error shape; valid input → updates the row (mock supabase update call) and returns `{ ok: true }`.

**Acceptance**:
- [ ] Valid input → supabase profile update is called with the trimmed value; `revalidatePath("/")` fires
- [ ] Empty input → returns `{ error: { field: "displayName", message: "Display name is required" } }` and does not call update
- [ ] Whitespace-only input → same error message after trimming; no update call
- [ ] >50 characters → returns `{ error: { field: "displayName", message: "Display name must be 50 characters or fewer" } }`; no update call

---

### Task 8b — Settings form: wire display-name editing into the action (S)

**Covers**: scenario-5 (full — closes the UI-visible criteria).

**Files**:
- MOD `features/settings/ui/settings-form.tsx`, `features/settings/ui/settings-form.test.tsx`, `features/settings/index.ts`

**Steps**:
1. `settings-form.test.tsx` first: submit with "Alice K." → expect success toast + field shows "Alice K."; submit with "" → expect "Display name is required" under the field; submit with "   " → same; submit with 51 chars → expect length error. Email input remains disabled across all cases.
2. `settings-form.tsx`: on submit, call `updateDisplayName`, `toast.success("Display name updated")` on `{ ok: true }`, display inline error under the field on the `{ error }` path. Call `router.refresh()` after success so the header avatar initial updates without a full reload.
3. Export `updateDisplayName` from `features/settings/index.ts`.

**Acceptance**:
- [ ] Edit "Alice" → "Alice K." + Save → success toast appears; field shows "Alice K."
- [ ] After save, the user's own project cards on `/` show the updated name (via `revalidatePath("/")`)
- [ ] After save, the avatar initial in the header reflects the new first character (verified via `router.refresh()` re-rendering the RSC header)
- [ ] Empty display name → "Display name is required" inline; nothing saved
- [ ] Whitespace-only display name → same message after trimming
- [ ] >50 characters → "Display name must be 50 characters or fewer"; nothing saved
- [ ] Email field remains disabled and has no save control attached to it

---

### Task 9 — `/settings` dedicated Log out button (S)

**Covers**: scenario-6 (full — both dropdown path and settings-page path).

**Files**:
- MOD `app/settings/page.tsx`, `app/settings/page.test.tsx`

**Steps**:
1. Test: page renders a "Log out" button; clicking it submits the `signOut` server action; after completion, user hits `/` as signed-out.
2. In `page.tsx`, add `<form action={signOut}><Button variant="outline" type="submit">Log out</Button></form>` below the form + read-only email.

**Acceptance**:
- [ ] "Log out" button visible on `/settings`
- [ ] Clicking it ends the session and returns to `/`
- [ ] After logout, header on `/` shows the Log in button, not the avatar
- [ ] After logout, clicking the Submit button on `/` triggers the existing sign-in prompt (closes spec scenario-6 criterion 4)
- [ ] Revisiting `/settings` after logout redirects to `/login?next=/settings`

---

### ✅ Checkpoint 2 — after Tasks 6–9 (including 8a and 8b)

Verify: full dropdown flow — Theme → Settings → edit display name → logout. Signed-out → `/settings` redirects; sign back in with `next=/settings`. All Vitest suites green.

---

### Task 10 — Relayout Project Board section on `/` (S)

**Covers**: scenario-1 and scenario-2 — their layout success criteria ("Submit at top-right of title row; horizontal separator; cohort filter right-aligned immediately below the separator, directly above the grid").

**Files**:
- MOD `app/page.tsx`, `app/page.test.tsx` (existing)

**Steps**:
1. Update the existing Project Board section JSX in `app/page.tsx`:
   - **Row 1**: `Project Board` heading (left) + `<SubmitDialog />` (right).
   - **Row 2**: description paragraph.
   - **Separator**: `<Separator />` (shadcn) or a thin border-top div.
   - **Filter toolbar row**: `flex justify-end` with "Filter by cohort" label + `<CohortDropdown />`, right-aligned.
   - **Grid**: `<ProjectGrid />` below.
2. Extend `app/page.test.tsx` if its current assertions depend on Submit being on the filter row — update to match the new layout order.

**Acceptance**:
- [ ] Submit button renders on the title row (top-right), not in the site header
- [ ] A horizontal separator appears between description and filter toolbar
- [ ] Cohort filter is right-aligned immediately below the separator, above the grid
- [ ] On mobile (≤375px), Submit wraps cleanly below the title; filter row is independently right-aligned
- [ ] Header widget still mounts above the Project Board section

---

### ✅ Final Checkpoint — after Task 10

- `bun run test` (Vitest + pgTAP) green
- `bun run build` clean
- `bun run test:e2e` — sanity check the existing e2e suite still passes (signup → main flow)
- Manual browser check: home signed-out, home signed-in (Submit top-right + filter below separator), avatar dropdown (theme / settings / logout), `/settings` (pre-filled + update → toast + card refresh, log out button), `/settings` signed-out redirect

## Verification

End-to-end paths to exercise in the browser (local `bun run dev` + `supabase start`):

1. **Signed-out home** — visit `/`; header shows `[logo] ... [Log in]`. Click Log in → `/login`. Click Submit → sign-in prompt (existing behavior).
2. **Signed-in home** — sign in via `/login` magic link; land on `/`; header shows `[logo] ... [A]` (or your initial). Project Board section: title + Submit (top-right) / description / separator / cohort filter (right) / grid.
3. **Theme switch** — open avatar → Theme → pick Dark; `<html class>` toggles; reload → stays dark. Press `d` → nothing happens.
4. **Settings navigation** — open avatar → Settings → `/settings` renders; display name pre-filled; email disabled; update name → toast; return to `/` → cards and avatar initial reflect new name.
5. **Logout from dropdown** — open avatar → Log out → back to `/`, signed-out header renders.
6. **Logout from settings** — click Log out on `/settings` → sent to `/`, signed-out header renders; revisit `/settings` → redirected to `/login?next=/settings`; complete sign-in → land on `/settings`.

## Risks & Unknowns

- **Revalidation scope**: updating `display_name` needs to refresh project cards on `/` (`revalidatePath("/")`) and the settings form itself. Verify that `router.refresh()` isn't additionally required for the client-side header avatar initial — if Next.js doesn't re-RSC the header after the server action returns, the form may need a `router.refresh()` after the toast.
- **Avatar trigger focus ring**: shadcn defaults are fine; do not apply custom `className` overrides per `shadcn-guard.md`.
- **Dropdown on mobile**: shadcn's `DropdownMenu` uses Radix, which handles touch well. No extra work expected.
