## Overview
Replacing a project's screenshot currently leaves the previous file behind in storage; only the delete-project flow cleans the file up. Users will not see any new control, but whenever a project screenshot is superseded — either by uploading a new one in the edit flow or by deleting the project — the previous stored image is removed. Storage cleanup is best-effort and never blocks the user's action.

## Scope

### Included
- When the owner replaces a project's screenshot through the edit flow, the previous stored image is removed after the row save succeeds.
- The existing delete-project screenshot cleanup is preserved with the same contract (removal happens after the row delete succeeds).
- Cleanup is best-effort: edit save and project delete report success to the user even if removing the previous image fails.

### Excluded
- Removing orphans from edits that do not change the screenshot — only replacement creates a new orphan.
- Background sweep of pre-existing orphans created before this feature ships — a one-time cleanup would be a separate backfill effort outside this scope.
- Hard guarantees / rollback on cleanup failure — best-effort keeps user-facing actions reliable.
- A user-facing "Remove image" control that leaves a project with no screenshot — projects still require a screenshot.

## Scenarios

### 1. Replace a project's screenshot
**Given** the owner of an existing project has opened the edit dialog for that project
**When** the owner selects a different image, saves the form, and the save succeeds
**Then** the card renders the new screenshot and the previous stored image stops serving at its original URL

Success Criteria:
- [ ] After save succeeds, requesting the previous screenshot URL returns a not-found response
- [ ] After save succeeds, the card renders from the newly uploaded image
- [ ] Title, tagline, and project URL remain exactly as the user entered them

### 2. Edit a project without changing the screenshot
**Given** the owner opens the edit dialog for a project with an existing screenshot
**When** the owner edits the title and/or tagline, leaves the screenshot field blank, and saves
**Then** the project's existing screenshot continues to serve and no stored object is removed

Success Criteria:
- [ ] After save succeeds, the original screenshot URL still returns the image
- [ ] After save succeeds, the card renders the original screenshot unchanged

### 3. Delete a project with a screenshot
**Given** the owner is signed in and their project is listed on the board
**When** the owner deletes the project and the server action succeeds
**Then** the project disappears from the board and its screenshot stops serving at its URL

Success Criteria:
- [ ] After delete succeeds, the project no longer appears on the board
- [ ] After delete succeeds, requesting the previous screenshot URL returns a not-found response

### 4. Storage cleanup failure does not block the user
**Given** a replace or delete action whose stored image cannot be removed (for example, the object is already missing from the bucket)
**When** the server action runs and the storage removal reports an error
**Then** the user's action is reported as successful and no error is surfaced in the UI

Success Criteria:
- [ ] Edit save closes the dialog and reports success even when removing the previous image errors
- [ ] Delete reports success and the project disappears from the board even when removing the screenshot errors
- [ ] A subsequent edit or resubmission by the same user is not blocked by the earlier cleanup error

## Invariants
- **Non-blocking cleanup**: storage-removal failures never cause the user-visible edit or delete action to fail.
- **Owner-gated**: a screenshot is only removed as a side effect of an edit or delete that the project's owner successfully performs. No other caller can trigger a screenshot removal.

## Dependencies
- Existing `edit-project` server action and its screenshot replacement input path
- Existing `delete-project` server action and its current storage cleanup path
- Supabase Storage bucket that holds project screenshots

## Undecided Items
None — all clarifications resolved in this session.
