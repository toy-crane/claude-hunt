## Overview
Introduce a reusable site header so every visitor sees a consistent top bar with the `claude-hunt` logo, a Submit entry point, and an account affordance (Log in / avatar menu). Scoped to the home page this round. Also adds a `/settings` page that lets a signed-in user update their display name, see their account email, and log out.

## Scope

### Included
- A reusable header, mounted on the home page (`/`) only this round
- The `claude-hunt` logo on the left, linking to `/`
- A "Log in" button on the right when the visitor is signed out
- An avatar dropdown menu on the right when the visitor is signed in, containing (top to bottom): a **Theme** section that lists Light / Dark / System as sibling selectable items under a "Theme" label, a **Settings** link, and a **Log out** action
- Removal of the existing `d` keyboard shortcut that toggles theme — the dropdown is now the single theme-switching surface
- A `/settings` page where the signed-in user can:
  - Edit their display name (same validation rules as onboarding)
  - See their account email, read-only
  - Log out from a dedicated button on the page
- Auth gate on `/settings` — signed-out visitors are redirected to `/login`

### Excluded
- Mounting the header on `/login`, `/onboarding`, or any other route — the user requested home only this round
- Editing cohort from `/settings` — the user opted not to include cohort change; cohort deletion is already handled by the onboarding gate (see `artifacts/onboarding-process/spec.md` scenario 6)
- Avatar image upload — not selected this round; the avatar menu trigger falls back to an initial/icon
- Email change, password change, account deletion, notification preferences — not requested; belong in later features
- Sticky or fixed header behavior — static (scrolls with content) is sufficient at current scale
- Global navigation links (About, Cohorts, etc.) — no secondary routes exist yet
- Sign-up entry point in the header — sign-up is part of the auth flow, already reachable from `/login`
- Moving the Submit button, cohort filter, or page title/description out of the Project Board section on `/` — within that section, Submit pins to the top-right of the title row and the cohort filter moves to its own row below the description; the site header carries only logo + auth affordance

## Scenarios

### 1. Signed-out visitor sees Log in in the header
**Given** a visitor without an active session is on `/`
**When** the page finishes loading
**Then** the header renders the logo and a Log in button — no avatar

Success Criteria:
- [ ] The `claude-hunt` logo is visible in the header and links to `/`
- [ ] A "Log in" button is visible in the header; clicking it navigates to `/login`
- [ ] No avatar element is rendered
- [ ] The Submit button appears at the top-right of the Project Board title row (same row as the "Project Board" heading), not in the site header; a horizontal separator divides the description from the list area, and the cohort filter sits right-aligned immediately below that separator, directly above the grid
- [ ] Clicking Submit while signed out still triggers the existing sign-in prompt (behavior carries over from the submit-project feature)

### 2. Signed-in visitor sees avatar dropdown
**Given** a signed-in visitor is on `/`
**When** the page finishes loading
**Then** the header renders the logo and an avatar button — no Log in button

Success Criteria:
- [ ] The avatar button is visible in the header; the Log in button is not rendered
- [ ] No Submit button is rendered in the site header (Submit stays in the Project Board section)
- [ ] When the signed-in user has no uploaded avatar image, the avatar shows the first character of their display name (or a generic user icon if display name is missing)
- [ ] Clicking the avatar opens a dropdown menu containing, in order: a "Theme" section with the sibling items "Light", "Dark", "System"; a "Settings" item; a "Log out" item
- [ ] Clicking outside the menu or pressing Escape closes the menu

### 3. Change theme from the avatar menu
**Given** a signed-in visitor has the avatar dropdown open
**When** the visitor clicks "Light", "Dark", or "System" under the "Theme" section
**Then** the app's theme updates immediately and the preference persists on reload

Success Criteria:
- [ ] The "Theme" label appears above the three sibling items, visually grouped so it is clear they belong together
- [ ] Selecting "Dark" → the page re-renders with the dark theme active (e.g. `<html>` gains the dark class/attribute)
- [ ] Selecting "Light" → the page re-renders with the light theme active
- [ ] Selecting "System" → the theme follows the OS preference
- [ ] The currently active theme is visually indicated next to its item (check mark, highlight, dot, or equivalent)
- [ ] After reload, the last selected theme is still in effect
- [ ] Pressing the `d` key anywhere in the app no longer changes the theme

### 4. Open the settings page
**Given** a signed-in visitor has the avatar dropdown open
**When** the visitor clicks "Settings"
**Then** the menu closes and the visitor lands on `/settings` with their current profile shown

Success Criteria:
- [ ] The URL becomes `/settings`
- [ ] The page renders a heading "Settings"
- [ ] The display-name input is pre-filled with the user's current display name
- [ ] The account email is shown read-only, clearly labelled
- [ ] A "Back to home" link returns to `/`
- [ ] Visiting `/settings` directly while signed out redirects to `/login`
- [ ] After signing in from that redirect, the visitor arrives at `/settings`

### 5. Update display name from settings
**Given** a signed-in visitor is on `/settings` with their current display name pre-filled
**When** the visitor changes the display name and saves
**Then** the new name is persisted and appears everywhere the user's name is shown

Success Criteria:
- [ ] Current name "Alice", edit to "Alice K." and save → success confirmation appears and the field now shows "Alice K."
- [ ] After save, the user's own project cards on `/` show the updated name
- [ ] After save, the avatar initial in the header reflects the first character of the new name
- [ ] Empty display name → "Display name is required" appears under the field and nothing is saved
- [ ] Display name of only whitespace (e.g., "   ") → same "Display name is required" message after trimming
- [ ] Display name longer than 50 characters → "Display name must be 50 characters or fewer" appears under the field and nothing is saved
- [ ] The email field cannot be edited and has no save control attached to it

### 6. Log out from settings or from the avatar menu
**Given** a signed-in visitor on either `/` (dropdown open) or `/settings`
**When** the visitor clicks "Log out"
**Then** the session ends and the visitor is returned to `/` as a signed-out user

Success Criteria:
- [ ] Clicking "Log out" in the avatar dropdown on `/` → the header re-renders with a Log in button and no avatar
- [ ] Clicking the "Log out" button on `/settings` → the visitor is sent to `/` and the header shows the Log in button
- [ ] A protected route (`/settings`) visited immediately after logout redirects to `/login`
- [ ] The Submit button, when clicked after logout, triggers the sign-in prompt

## Invariants
- The avatar button and its dropdown are only rendered when a session exists. No path (direct URL, stale UI, etc.) shows the avatar or its menu to a signed-out visitor.
- Header state reflects the current session at render time: exactly one of "Log in button" or "avatar button" is shown — never both, never neither.
- The display name shown to the user (in the header avatar initial, on their own project cards, and in the settings form) is always consistent with the most recently saved value.
- `/settings` is never reachable by an unauthenticated request, regardless of entry path.

## Dependencies
- Authentication (an existing session cookie identifies the signed-in user; logout is supported)
- Theme provider (the app already has a runtime theme mechanism capable of switching Light / Dark / System)
- Submit project feature (the existing Submit dialog and its sign-in prompt for signed-out users)
- Onboarding-process feature (display name was initially captured there; settings reuses the same validation rules: required, trimmed, max 50 characters)

## Undecided Items
- None
