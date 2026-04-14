## Overview
Let signed-in users permanently delete their own account from the Settings page, and reorganize Settings into a clearer sectioned layout (Profile / Account / Danger Zone) so account actions sit in predictable places.

## Scope

### Included
- Settings page is reorganized into three labeled sections: `Profile`, `Account`, `Danger Zone`
- In `Profile`, Email is displayed before Display name
- `Log out` is moved into the `Account` section
- A new `Delete account` row in `Danger Zone` opens a typed-confirmation dialog
- Successful withdrawal removes the user's profile, submitted projects, votes, and uploaded screenshots, signs the user out, and redirects to the home page

### Excluded
- Soft-delete or account recovery — withdrawal is permanent; matches the cohort-sized audience and avoids a "deleted user" placeholder
- Anonymizing submitted projects to keep them on the board — rejected in favor of cascade delete for simplicity this round
- Email OTP re-verification before withdrawal — typed confirmation is sufficient at this stage
- Undo window or grace period — out of scope for v1
- Exporting user data before deletion — deferred; revisit if requested

## Scenarios

### 1. Open the redesigned Settings page
**Given** a signed-in user navigates to `/settings`
**When** the page renders
**Then** three labeled sections are visible, each in its own card, in this order: `Profile`, `Account`, `Danger Zone`

Success Criteria:
- [ ] `Profile` card shows the Email row first, then the Display name row, then a `Save` button at the bottom-right of the card
- [ ] `Account` card shows a `Log out` button
- [ ] `Danger Zone` card shows a `Delete account` row with a `Withdraw` button and a warning line ("Permanently remove your profile, projects, and votes. This cannot be undone.")
- [ ] The top-left `Back to home` link still navigates to `/`

### 2. Withdraw account successfully
**Given** a signed-in user viewing `/settings`
**When** the user clicks `Withdraw`, types their email address into the confirmation field, and clicks the final red `Delete account` button
**Then** the account is deleted, the session ends, and the user lands on the home page

Success Criteria:
- [ ] Clicking `Withdraw` opens a dialog titled "Delete account" listing what will be removed (profile, submitted projects, votes, uploaded screenshots)
- [ ] The final confirmation button is disabled until the user types their exact email into the confirmation input
- [ ] After confirmation, the user is redirected to `/` and the top-right navigation shows the signed-out state (no user menu)
- [ ] Visiting `/settings` again redirects to `/login?next=/settings`
- [ ] The user's previously submitted projects no longer appear on the home project board
- [ ] Any upvote counts that relied on this user's votes decrease by 1 per removed vote
- [ ] Attempting to log in with the same email address goes through the normal sign-up flow (no lingering account)

### 3. Cancel withdrawal from the dialog
**Given** the Delete-account dialog is open
**When** the user clicks `Cancel` or closes the dialog
**Then** the dialog closes and no data is deleted

Success Criteria:
- [ ] Dialog closes, `/settings` remains unchanged
- [ ] The user's projects and votes are still present on the home page
- [ ] Re-opening the dialog shows the confirmation input empty again

### 4. Typed confirmation must match
**Given** the Delete-account dialog is open for a user whose email is `alice@example.com`
**When** the user types text other than `alice@example.com` into the confirmation input
**Then** the final `Delete account` button stays disabled and cannot be clicked

Success Criteria:
- [ ] input=`alice` → button disabled
- [ ] input=`ALICE@EXAMPLE.COM` (wrong case) → button disabled
- [ ] input=`alice@example.com` (exact match) → button enabled
- [ ] Clearing the input disables the button again

### 5. Unauthenticated visitor cannot withdraw
**Given** a visitor without a logged-in session
**When** the visitor navigates directly to `/settings`
**Then** the visitor is sent to the login page and never sees the Delete account control

Success Criteria:
- [ ] Visiting `/settings` while logged out redirects to `/login?next=/settings`
- [ ] No request to the withdraw endpoint can succeed without an authenticated session (returns an error, no deletion occurs)

## Invariants
- **Security**: A withdrawal request only ever deletes the account of the currently authenticated user. No parameter, header, or body value on the request can cause another user's account to be deleted.
- **Data consistency**: After a successful withdrawal, none of the deleted user's content (profile, projects, votes, uploaded screenshots) is reachable from any public path — home project board, direct project URL, avatar URL, or search.
- **Atomicity from the user's perspective**: If withdrawal fails partway (e.g., storage cleanup error), the user sees a clear error and their account is still usable. A partially-deleted state must not leave the user logged in without a profile.

## Dependencies
- Authentication (viewer session required to open `/settings` and to call the withdraw endpoint)
- Existing cascade relationships on `profiles → projects → votes`
- Storage bucket holding project screenshots (must be cleared for the withdrawing user before or during account deletion, since Supabase blocks deleting an auth user that still owns storage objects)

## Undecided Items
- None
