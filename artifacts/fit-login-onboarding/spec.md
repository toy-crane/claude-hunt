## Overview
Align the visual layout of the `/login` and `/onboarding` screens so they read as two steps of the same flow. Today the two screens share an outer shell but diverge in the header: login uses the CLI-style `claude-hunt` wordmark while onboarding still shows a plain "Claude Hunt" text and its own heading. This feature brings both screens to a single header pattern (Logo → page heading → subtitle) with no change to the form contents, routing, or behavior underneath.

## Scope

### Included
- The `/login` screen header uses Logo → `<h1>` → subtitle, in that order
- The `/onboarding` screen header uses Logo → `<h1>` → subtitle, in that order
- Both screens use the same brand Logo component at the same visual size
- Both screens share the same page shell (background, vertical centering, max form width, horizontal/vertical padding)
- The spacing between the header block and the first form control is identical on both screens
- The Logo's underscore cursor blinks on BOTH `/login` and `/onboarding` (this supersedes the create-logo spec's "login-hero only" motion invariant — see Notes for Downstream Specs)

### Excluded
- Form contents (inputs, buttons, validators, error messages, sign-out button) — unification is layout-level only; behavior is out of scope
- Routing and redirect gates (`/login`, `/onboarding`, `/auth/callback`) — no change to who can reach which screen or where they get sent afterward
- Copy rewrites of existing validation / error messages — only the page heading and subtitle strings are touched
- Extracting a shared layout component — whether to share markup or duplicate it is an implementation decision for plan.md
- A new authenticated route or wrapper layout that wraps other auth-related pages (e.g., `/auth/auth-code-error`) — scope stays at login + onboarding
- Theme or color changes — light/dark palette and component styling remain as today

## Scenarios

### 1. Login header follows the unified pattern
- **Given** — an unauthenticated visitor opens `/login`
- **When** — the page finishes loading
- **Then** — the visitor sees the Logo, then a page heading, then a one-line subtitle, above the sign-in controls

Success Criteria:
- [ ] The `claude-hunt` Logo is the first visible element inside the login form block
- [ ] A single `<h1>` is rendered below the Logo with non-empty text introducing the sign-in action (e.g., "Welcome back")
- [ ] A subtitle paragraph is rendered below the `<h1>` with muted-foreground styling
- [ ] The GitHub, Google, and email controls appear below the subtitle, in the same order as today
- [ ] The Logo's underscore cursor blinks

### 2. Onboarding header follows the unified pattern
- **Given** — a signed-in user with no cohort is routed to `/onboarding`
- **When** — the page finishes loading
- **Then** — the user sees the Logo, then a page heading, then a one-line subtitle, above the onboarding form

Success Criteria:
- [ ] The `claude-hunt` Logo is the first visible element inside the onboarding form block
- [ ] The plain text "Claude Hunt" no longer appears on `/onboarding`
- [ ] A single `<h1>` is rendered below the Logo with non-empty text describing the onboarding task (e.g., "Set up your profile")
- [ ] A subtitle paragraph is rendered below the `<h1>` with muted-foreground styling and explains what the form will capture
- [ ] The display-name field, cohort selector, Continue button, and Sign out button appear below the subtitle, in the same order as today
- [ ] The Logo's underscore cursor blinks on `/onboarding` (same motion as on `/login`)

### 3. Shared page shell across both screens
- **Given** — the `/login` and `/onboarding` screens are compared side by side
- **When** — each page finishes loading at the same viewport size
- **Then** — the outer shell is visually identical: same background, same vertical centering, same form width, same horizontal and vertical padding

Success Criteria:
- [ ] Both pages render the form block horizontally centered in the viewport
- [ ] Both pages render the form block vertically centered in the viewport at heights ≥ the form block's own height
- [ ] Both pages use the same maximum form width (the form does not grow wider than on the other page at any viewport ≥ 320 px)
- [ ] Both pages use the same page background color in light mode and in dark mode
- [ ] Both pages use the same top/bottom padding at the mobile and desktop breakpoints the app already defines

### 4. Shared header rhythm across both screens
- **Given** — the `/login` and `/onboarding` screens are compared side by side
- **When** — each header block is rendered
- **Then** — Logo → `<h1>` → subtitle appears in the same order, at the same relative sizes, with the same vertical spacing between each element and between the header block and the first form control

Success Criteria:
- [ ] The Logo renders at the same font-size on both screens
- [ ] The `<h1>` renders at the same font-size and font-weight on both screens
- [ ] The subtitle renders at the same font-size and color on both screens
- [ ] The vertical gap between Logo and `<h1>` is identical on both screens
- [ ] The vertical gap between subtitle and the first form control is identical on both screens

### 5. No regression in existing auth and onboarding behavior
- **Given** — the unified layout is in place
- **When** — a user runs through the existing flows (sign in with email or OAuth, complete onboarding, hit validation errors, sign out from onboarding, land on the auth error page)
- **Then** — every observable behavior documented in `artifacts/auth/spec.md` and `artifacts/onboarding-process/spec.md` continues to hold

Success Criteria:
- [ ] All Success Criteria in `artifacts/auth/spec.md` scenarios 1–4, 13, 14 continue to pass on `/login` (the auth page-surface scenarios; backend scenarios 9–12 are untouched)
- [ ] All Success Criteria in `artifacts/onboarding-process/spec.md` scenarios 1–6 continue to pass on `/onboarding`
- [ ] No change to the redirect behavior of `/login`, `/onboarding`, or `/auth/callback` for any signed-in / signed-out / onboarded / not-onboarded user state

## Invariants
- **One Logo per screen.** Each screen shows exactly one `claude-hunt` Logo, at the top of the form block. No additional brand wordmark appears elsewhere on the screen.
- **Consistent motion.** The blinking underscore is rendered on every screen that shows the Logo as the page hero — currently `/login` and `/onboarding`. Motion never differs between these two screens.
- **Layout-only change.** No authentication, onboarding, validation, or persistence behavior is altered by this feature. Every form control keeps the same id, label, role, data-testid, and submit outcome it has today.
- **Single source of header truth.** The two screens never drift again: any future change to the Logo size, heading font, or subtitle color must update both screens together (enforced either by shared markup or by an explicit visual cross-check).

## Dependencies
- The existing `Logo` component (shipped by `artifacts/create-logo/`) must remain available and support at least the blink/non-blink variants used today
- The existing `/login` and `/onboarding` routes, their redirect gates, and their form components must continue to exist
- The existing theme tokens (background, muted-foreground, terracotta accent) must continue to resolve in both light and dark mode

## Notes for Downstream Specs
This feature supersedes the **Motion restraint** invariant in `artifacts/create-logo/spec.md`, which previously required the blinking cursor to appear only on the login hero. With the unification in place, both `/login` and `/onboarding` render the blinking Logo as their page hero. The create-logo spec should be updated (or retired in favor of this one) in the same change that ships this feature, so the two documents do not contradict each other.

## Undecided Items
- None
