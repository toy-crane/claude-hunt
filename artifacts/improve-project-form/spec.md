## Overview
Move the project submission form out of the inline bordered section on the landing page and into a modal dialog opened from a single "Submit a project" button. Visitors see a less cluttered landing page focused on browsing, and the submit experience becomes consistent with the existing edit flow.

## Scope

### Included
- A "Submit a project" trigger button on the landing page, visible to all visitors (signed-in or not)
- A modal dialog that hosts the existing submit form (title, tagline, project URL, screenshot) when opened
- A sign-in redirect path for signed-out visitors who press the trigger
- A guidance banner inside the dialog for signed-in students without a cohort, with the form rendered but unable to submit
- A brief confirmation notification after a successful submission, with the dialog closing automatically and the new card appearing in the grid
- Silent discard of any in-progress draft when the dialog is closed (backdrop click, Esc, or close button)

### Excluded
- Changes to field validation, character counters, or screenshot upload UX — out of scope for this pass; the existing submit form's validation stays unchanged
- Draft persistence across dialog close/reopen — scope creep; forced-close data loss is acceptable for a four-field form
- A confirm-before-discard prompt when closing with unsaved input — explicitly chosen against; close is silent
- A tooltip / disabled trigger for signed-in-without-cohort — chosen against; the dialog opens and surfaces guidance inside instead
- Scroll-to-new-card animation after submission — not requested; the grid simply re-renders with the new card in sort order
- Server-side behavior changes (auth checks, cohort enforcement, persistence) — unchanged; only presentation moves

## Scenarios

### 1. Signed-in student with a cohort opens the dialog and submits
- **Given** a signed-in student whose profile has a cohort assigned, viewing the landing page
- **When** the student presses the "Submit a project" button, fills in title, tagline, project URL, and a valid screenshot, then presses Submit
- **Then** the dialog closes, a brief confirmation appears, and a new card for the submitted project shows up in the grid

Success Criteria:
- [ ] Signed-in student with cohort on the landing page → a "Submit a project" button is visible
- [ ] Press the button → a modal dialog opens containing the submit form with fields for title, tagline, project URL, and screenshot
- [ ] Fill title="My App", tagline="A cool tool", project URL="https://myapp.com", valid screenshot, press Submit → the dialog closes on its own
- [ ] After a successful submission → a short confirmation message appears on the page (auto-dismissing)
- [ ] After a successful submission → the grid shows a new card with title "My App" and tagline "A cool tool"

### 2. Signed-out visitor is redirected to sign in
- **Given** a signed-out visitor on the landing page
- **When** the visitor presses the "Submit a project" button
- **Then** the visitor is taken to the sign-in page; no dialog opens

Success Criteria:
- [ ] Signed-out visitor on the landing page → the "Submit a project" button is visible
- [ ] Signed-out visitor presses the button → the page navigates to the sign-in route
- [ ] After signing in from that redirect → the visitor lands back on the landing page and can press the button again to open the dialog
- [ ] Signed-out visitor presses the button → no dialog opens on the landing page

### 3. Signed-in student without a cohort sees guidance
- **Given** a signed-in student whose profile has no cohort assigned, viewing the landing page
- **When** the student presses the "Submit a project" button
- **Then** the dialog opens with a guidance banner explaining they need a cohort assignment, the form fields are shown but disabled, and the Submit action is unavailable

Success Criteria:
- [ ] Signed-in student without a cohort → the "Submit a project" button is visible and pressable
- [ ] Press the button → the dialog opens
- [ ] Inside the dialog → a guidance message reads "Contact your instructor to get assigned to a cohort before submitting a project"
- [ ] Inside the dialog → the title, tagline, project URL, and screenshot inputs are visible but disabled
- [ ] Inside the dialog → the Submit button is disabled and cannot be activated

### 4. Closing the dialog mid-draft discards input
- **Given** the submit dialog is open and the student has typed into one or more fields
- **When** the student closes the dialog by any means (pressing the close button, pressing Esc, or clicking the backdrop)
- **Then** the dialog closes immediately with no confirmation, and the typed input is not restored if the dialog is reopened

Success Criteria:
- [ ] Type title="Draft title", close the dialog with the close button → the dialog closes immediately; no confirmation prompt appears
- [ ] Type title="Draft title", press Esc → the dialog closes immediately; no confirmation prompt appears
- [ ] Type title="Draft title", close, then reopen the dialog → title is empty
- [ ] All other fields (tagline, project URL, screenshot) are also cleared when the dialog is reopened

### 5. Landing page no longer renders an inline submit section
- **Given** the landing page in any viewer state (signed-out, signed-in with cohort, signed-in without cohort)
- **When** the landing page is rendered
- **Then** no bordered "Submit a project" section appears inline above the grid; the trigger button is the only entry point to the submit flow

Success Criteria:
- [ ] Signed-in student with cohort → landing page shows the grid and the trigger button, not an inline form section
- [ ] Signed-in student without cohort → landing page shows the grid and the trigger button, not an inline form section with a visible banner
- [ ] Signed-out visitor → landing page shows the grid and the trigger button, not an inline form section

## Invariants
- **Server-side enforcement is unchanged.** Signed-out users and users without a cohort cannot persist a project regardless of UI path; the dialog is a presentation change only.
- **Draft data does not cross dialog sessions.** Closing the dialog always drops the typed values; reopening starts from empty fields. No client-side persistence of unsaved input.
- **Single entry point.** The trigger button is the only way to open the submit dialog from the landing page; the inline bordered submit section is removed entirely.

## Dependencies
- The existing submit form (title, tagline, project URL, screenshot upload, validation, and server action) — reused as-is inside the dialog
- Sign-in route (`/login`) — already exists and is the destination for the signed-out redirect
- The existing cohort assignment check on the student's profile — already exists and drives the guidance banner

## Undecided Items
- None
