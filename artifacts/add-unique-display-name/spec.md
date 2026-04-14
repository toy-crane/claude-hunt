## Overview
Display names identify users on project cards and in the header menu. Today two users can register the same name, which makes those surfaces ambiguous. This feature makes every display name unique across all users so each card and menu entry points to exactly one person.

## Scope

### Included
- Onboarding rejects a display name that another user already holds
- Settings rejects a display name change that collides with another user
- Comparison ignores letter case — "Alice" and "alice" are treated as the same name
- Saving the signed-in user's own current display name (no change) still succeeds

### Excluded
- Backfilling or renaming any pre-existing duplicate rows — the course project has no live duplicates today; if one slips through, the rollout fails loud and we investigate then
- Live "name is available" feedback while the user is still typing — submit-time feedback is sufficient for this scale; can be added later
- Changing how stored values are cased — the user's original casing is preserved on display; only the comparison is case-insensitive
- Reserving or blocklisting specific names (e.g. "admin") — out of scope; handled separately if ever needed

## Scenarios

### 1. Onboarding picks an available name
**Given** a newly signed-in user on the onboarding form, and no other profile holds the name "Alice"
**When** the user enters "Alice", picks a cohort, and submits
**Then** onboarding completes and the user lands on the home page with "Alice" shown on their profile surfaces

Success Criteria:
- [ ] displayName="Alice" with no existing holder → form submits, user is redirected to "/"
- [ ] The header menu shows "Alice" after redirect

### 2. Onboarding rejects a taken name (case-insensitive)
**Given** another profile already holds the display name "Alice", and a new user is on the onboarding form
**When** the new user enters "alice" (or "ALICE", or "Alice") and submits
**Then** the submission is rejected with a clear "already taken" message, and the form stays open with the typed value preserved

Success Criteria:
- [ ] displayName="alice" while another profile holds "Alice" → an error message identifying the display-name field appears (e.g. "That display name is already taken")
- [ ] The user remains on the onboarding page — no redirect happens
- [ ] The typed value "alice" is still in the input after the error

### 3. Settings rejects a taken name
**Given** a signed-in user on `/settings`, and another profile already holds "Bob"
**When** the user changes their display name to "bob" and saves
**Then** the save fails with an inline error on the display-name field, and the stored value does not change

Success Criteria:
- [ ] displayName="bob" while another profile holds "Bob" → inline error under the display-name field (e.g. "That display name is already taken")
- [ ] Reloading `/settings` still shows the previous display name (the change was not persisted)
- [ ] Project cards authored by this user still show the previous display name

### 4. Settings saves own current name
**Given** a signed-in user whose display name is "Alice" is on `/settings`
**When** the user presses Save without changing the field (value stays "Alice")
**Then** the save succeeds without an "already taken" error

Success Criteria:
- [ ] Value "Alice" unchanged → save succeeds, success toast appears
- [ ] No error message is shown on the display-name field

## Invariants
- **Data consistency.** Across every write path (onboarding, settings, and any future path), no two profiles hold display names that match case-insensitively after trimming. If two writes race for the same name, at most one succeeds; the other receives the same "already taken" error that a normal collision would produce.

## Dependencies
- Onboarding flow (first-time display-name entry)
- Settings flow (display-name edits)

## Undecided Items
_None — all open questions were resolved during spec writing._
