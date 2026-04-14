## Overview
Give newly signed-in students a short one-screen form to set their display name and pick a cohort before they use the rest of the app. Without this, signed-in students with no cohort hit a dead end ("contact your instructor") on the submission flow; with it, they self-serve in under 15 seconds and can submit projects immediately.

## Scope

### Included
- A dedicated onboarding screen with a display name field and a cohort selector
- Automatic redirection of signed-in users with no cohort to the onboarding screen
- Preservation of the originally requested URL so the user lands where they intended after completing onboarding
- Client-visible validation errors for missing or invalid input
- Handling of the edge case where no cohorts yet exist in the system

### Excluded
- Editing display name or cohort after onboarding — belongs in a future profile-settings feature; onboarding is one-time-entry only
- Cohort creation / management UI — cohorts remain seeded by instructors via migrations, per the existing Micro-Hunt design decision
- Pre-filling the display name from OAuth metadata — product decision: the user types their name deliberately on this form, even though an auto-populated value may exist in the profile
- Avatar upload — out of scope; not needed for the MVP onboarding flow
- A "skip for now" option — onboarding is a hard gate

## Scenarios

### 1. Signed-in user with no cohort is sent to onboarding
**Given** a signed-in user whose profile has no cohort assigned
**When** the user visits any authenticated page of the app (including the landing page)
**Then** the user is redirected to the onboarding screen with the originally requested path preserved so it can be returned to after submit

Success Criteria:
- [ ] Signed-in user with `cohort_id` unset visits `/` → the user ends up on `/onboarding`
- [ ] Signed-in user with `cohort_id` unset visits `/onboarding?next=/somewhere` → the page loads without further redirect
- [ ] Unauthenticated visitor is never redirected to `/onboarding` (only signed-in users can reach it)

### 2. Complete onboarding successfully
**Given** a signed-in user without a cohort is on the onboarding screen, with at least one cohort available
**When** the user types a valid display name, picks a cohort from the list, and submits
**Then** the profile is updated and the user is returned to the originally requested destination

Success Criteria:
- [ ] Display name = "Alice", cohort = "Cohort A" → after submit, the user lands on the originally requested URL (or `/` if none was captured)
- [ ] After submit, revisiting any authenticated page no longer redirects to onboarding
- [ ] After submit, the project submission form on `/` is no longer blocked by "contact your instructor" messaging
- [ ] The display name shown on the user's own submitted project cards matches what was entered on the onboarding form

### 3. Reject invalid input on submit
**Given** the onboarding screen is open and at least one cohort exists
**When** the user submits with missing or invalid input
**Then** the submission is rejected and the user sees clear per-field feedback; no profile update occurs

Success Criteria:
- [ ] Empty display name → "Display name is required" appears under the display name field, the form does not submit, and the profile is unchanged
- [ ] Display name of only whitespace (e.g., "   ") → same "Display name is required" message after trimming
- [ ] Display name longer than 50 characters → "Display name must be 50 characters or fewer" appears under the display name field
- [ ] No cohort selected → "Please select a cohort" appears near the cohort selector
- [ ] On error, previously entered values (other than the invalid field) are preserved

### 4. Onboarded user cannot re-enter the onboarding screen
**Given** a signed-in user whose profile already has a cohort assigned
**When** the user navigates to `/onboarding` directly
**Then** the user is redirected away from onboarding so they never re-run the form

Success Criteria:
- [ ] Signed-in user with `cohort_id` set visits `/onboarding` → the user is redirected to `/`
- [ ] Signed-in user with `cohort_id` set visits `/onboarding?next=/some-page` → the user is redirected to `/some-page`

### 5. No cohorts available yet
**Given** the cohorts list is empty (no cohorts have been seeded)
**When** a signed-in user with no cohort reaches the onboarding screen
**Then** the form explains that onboarding cannot be completed and offers no misleading submit path

Success Criteria:
- [ ] Zero cohorts exist → the cohort selector is not rendered and a visible message reads "No cohorts are available yet. Please contact your instructor."
- [ ] Zero cohorts exist → the Submit button is either hidden or disabled (the user cannot submit an invalid request)
- [ ] A sign-out control is visible so the user is not trapped

### 6. Cohort deletion returns a user to onboarding
**Given** a previously onboarded user whose assigned cohort has since been deleted (their `cohort_id` is cleared by the existing `ON DELETE SET NULL`)
**When** that user visits any authenticated page
**Then** the onboarding gate treats them the same as a brand-new user and prompts them to pick a cohort again

Success Criteria:
- [ ] User's cohort row is deleted, user visits `/` → redirected to `/onboarding`
- [ ] Re-submitting with a new cohort succeeds exactly as in scenario 2

## Invariants
- **Completion condition is single-field.** A user is considered "onboarded" if and only if their profile has a non-null `cohort_id`. Display name alone is not sufficient; cohort alone is sufficient.
- **No bypass path.** A signed-in user without a cohort cannot reach any authenticated surface of the app (submission form, profile actions, vote actions bound to their identity) through any path — direct URL, refresh, or deep link — without first completing onboarding.
- **Saves affect only the current user.** The display name and cohort written on submit always belong to the currently signed-in account; no request can update another user's profile regardless of the submitted payload.

## Dependencies
- Existing authentication flow (sign-in, session establishment, sign-out)
- Existing `profiles` row that is auto-created on sign-up, including the `display_name` and `cohort_id` columns
- Existing `cohorts` catalog (readable by any authenticated user)
- Existing auth callback redirect behavior (the `next` query-param convention is already used after sign-in and will be reused here)

## Notes for Downstream Specs
This feature obsoletes the "Contact your instructor to get assigned to a cohort" guidance in the Micro-Hunt submission form (`micro-hunt/spec.md` scenario 4). With the hard gate in place, any signed-in user who reaches the submission form is guaranteed to already have a cohort. That Micro-Hunt scenario should be removed or rewritten in the same change that ships this feature.

## Undecided Items
- None
