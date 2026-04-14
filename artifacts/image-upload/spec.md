## Overview
Project Board currently rejects screenshot uploads over 5 MiB, blocking submissions of typical phone and DSLR photos. Users will be able to upload source files up to 25 MiB; the browser automatically downscales and re-encodes each image to a standard output before upload, so the grid keeps loading quickly.

## Scope

### Included
- Accept source files up to 25 MiB in the submit-project and edit-project flows (up from 5 MiB)
- Client-side downscale + re-encode to a standard output (longest side ≤ 1920 px, WebP, ~85% quality) before upload
- Reject with a clear error when the browser cannot decode or downscale the selected file
- Preserve the current source MIME allow-list: JPEG, PNG, WebP

### Excluded
- Additional source formats (HEIC, GIF, AVIF) — keeps decode-compatibility predictable this round; can be added on demand
- Server-side (on-the-fly) image transformation — requires Supabase Pro plan; deferred
- Multi-image uploads per project — outside the stated problem (limit is too small)
- Guaranteed EXIF stripping as a privacy feature — canvas re-encode drops EXIF as a side effect, but it is not being contracted here

## Scenarios

### 1. Upload a large photo successfully
**Given** a logged-in user is on the submit form with an 18 MiB, 4032×3024 JPEG selected
**When** the user submits the form
**Then** the project is created and the screenshot renders on the resulting card

Success Criteria:
- [ ] 18 MiB / 4032×3024 JPEG source → submission succeeds, the new card renders the screenshot
- [ ] The stored image served back to the browser has its longest side ≤ 1920 px
- [ ] The stored image served back to the browser is under 1 MiB for a typical 4032×3024 JPEG source
- [ ] The stored image is served with the `image/webp` content type

### 2. Reject a file above the new cap
**Given** a logged-in user has selected a 30 MiB file on the submit form
**When** the user attempts to submit
**Then** the upload does not proceed and a clear size-limit error appears before any network upload starts

Success Criteria:
- [ ] 30 MiB file selected → "File must be 25 MB or smaller" is displayed under the file field
- [ ] No storage object is created for the oversize file
- [ ] Title, tagline, and URL values the user already typed remain intact

### 3. Reject a file the browser cannot process
**Given** a logged-in user selects a corrupt or undecodable image under 25 MiB
**When** the browser attempts to decode and downscale it
**Then** the upload does not proceed and an actionable error appears

Success Criteria:
- [ ] Corrupt file under 25 MiB selected → "Could not process this image. Try a different file." is displayed
- [ ] No storage object is created for the rejected file
- [ ] The user can choose a different file and continue without refreshing the page

### 4. Edit an existing project with a new large screenshot
**Given** the owner of an existing project opens the edit dialog for that project
**When** the owner replaces the screenshot with a new 12 MiB, 3000×2000 photo and saves
**Then** the card updates to show the new screenshot, meeting the same output contract as new submissions

Success Criteria:
- [ ] 12 MiB / 3000×2000 source in the edit dialog → save succeeds, card updates to the new screenshot
- [ ] The replacement stored image has its longest side ≤ 1920 px
- [ ] On decode or network failure during replacement, the card still shows the previous screenshot (no broken image)

### 5. Small image already within the target
**Given** a logged-in user selects an 800×600, 300 KiB PNG on the submit form
**When** the user submits
**Then** the project is created and the image renders correctly on the card

Success Criteria:
- [ ] 300 KiB / 800×600 PNG source → submission succeeds, card renders the screenshot
- [ ] The stored image visibly represents the same picture the user selected

## Invariants
- **Storage shape**: every image stored through submit-project or edit-project has its longest side ≤ 1920 px. No code path bypasses this contract.
- **Server-side defence**: the Storage bucket rejects any object exceeding the bucket's configured size cap, regardless of what the client attempts.
- **MIME safety**: any source file whose MIME type is outside JPEG / PNG / WebP is rejected before the decode step, on both submit and edit flows.

## Dependencies
- Existing submit-project form
- Existing edit-project dialog (shares the same upload path)
- Authentication (upload requires a logged-in user)

## Undecided Items
None — all clarifications resolved in this session.
