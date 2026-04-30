## Overview
Add a dedicated detail page for every submitted project so visitors can see a richer presentation than the board card allows (multi-image gallery, full tagline, optional GitHub link), leave comments, replies, and emoji reactions, and share a stable URL with a social preview card. The board's card click changes from "open external URL in a new tab" to "navigate to the project's detail page."

## Scope

### Included
- A detail route per project, reachable from the board by clicking a project card (thumbnail, title, or row body)
- Image gallery: 1 required image plus up to 4 optional images per project; the first image is the primary used for the board thumbnail and the social preview
- Optional GitHub repository URL on the project, validated as a `https://github.com/<owner>/<repo>` pattern
- "Visit project" CTA on the detail page that opens the external project URL in a new tab; a "GitHub" CTA appears only when the GitHub URL is set
- Vote button on the detail page mirroring the board (one vote per visitor per project, no self-vote)
- Project owner's edit and delete controls on the detail page mirroring the board
- Comments by any authenticated visitor; one level of replies (no reply-to-reply); plain text up to 1000 characters
- Emoji reactions on comments and replies, fixed set: 👍 💡 🎉 ❤️
- Comment authors can edit and delete their own comments and replies; edited comments are flagged as "수정됨"
- Comment list sorted newest-first at the top level, oldest-first within a reply group
- Open Graph share card on the detail page (primary image, title, tagline, cohort label)

### Excluded
- Author notifications (in-app or email) when a comment or reaction lands — kept passive in v1; visitors check the pages they care about. Notification infrastructure is a larger scope decision deferred until volume justifies it.
- Mentions, autolinking, or rich text inside comments — moderation burden was the original reason comments were excluded from the board. Plain text keeps the moderation surface small.
- Reporting / flagging / moderation queue — relies on closed cohort trust at v1; revisit if abuse appears.
- Author profile pages — out of scope this round; the detail page is project-centric, not person-centric.
- Project-level emoji reactions — vote already serves the project-level "I like this" signal; reactions live only on comments and replies to avoid overlap.
- Reply depth beyond one level — keeps the layout flat enough to render clearly on mobile.
- Auto-fetched description or screenshot from the external project URL — scraper infrastructure is its own scope.
- Changes to the board card layout itself — the only board-facing change is what happens on click.

## Scenarios

### 1. View a project's detail page from the board
- **Given** any visitor (signed-in or not) is on the project board
- **When** the visitor clicks a project's card
- **Then** the visitor lands on the project's detail page showing all submitted content and any existing comments

Success Criteria:
- [ ] A project with title="My App", tagline="A cool tool", cohort="LGE-1" → the detail page renders the title, the full tagline (no truncation), the cohort label, the author's display name and avatar, the submitted-at timestamp, and the current vote count
- [ ] A project with 3 images → the gallery shows all 3 with the primary visible first; the visitor can advance to the others without leaving the page
- [ ] The "Visit project" button opens the project URL in a new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- [ ] If the project has a GitHub URL, a separate "GitHub" button appears and opens that URL in a new tab; if not, no GitHub button is rendered
- [ ] An anonymous visitor sees the same project content, comments, replies, reaction counts, and vote count as a signed-in visitor

### 2. Submit a project with multiple images and a GitHub URL
- **Given** an authenticated student opens the submit form
- **When** the student adds 1 required image, 2 additional images, a GitHub URL, plus the existing required fields, and submits
- **Then** the project is created with all 3 images in upload order, and the GitHub link appears as a separate CTA on its detail page

Success Criteria:
- [ ] Submitting with only the required image succeeds; the optional image slots may be empty
- [ ] Attempting to attach a 6th image is blocked with a "최대 5장까지 업로드할 수 있어요" message; previously entered fields are preserved
- [ ] GitHub URL "https://github.com/octocat/hello" is accepted; "https://example.com/hello" is rejected with a "GitHub 저장소 주소를 입력해주세요" message under the field
- [ ] The first uploaded image is used as both the board thumbnail and the social preview image
- [ ] In the edit dialog, the owner can reorder images; saving with a new first image makes that image the primary, and the board thumbnail and OG image update accordingly on the next page render

### 3. Leave a comment, reply to it, and react
- **Given** an authenticated visitor is on a project's detail page
- **When** the visitor writes a top-level comment, replies to it, and taps an emoji reaction on the reply
- **Then** the comment, the reply, and the reaction count are immediately visible on the page and persist after reload

Success Criteria:
- [ ] A new top-level comment appears at the top of the comment list with the author's display name, avatar, and a timestamp
- [ ] A reply appears nested under its parent comment; the reply itself shows no "Reply" button (no reply-to-reply)
- [ ] Tapping 💡 on a comment shows a 💡 chip with count "1"; tapping 💡 again removes the visitor's reaction (count "0", chip hidden)
- [ ] Two different visitors tapping 💡 on the same comment shows count "2"
- [ ] Only the four reactions 👍, 💡, 🎉, ❤️ are offered; no other emoji can be added through the UI or by direct request
- [ ] The visitor may react to and reply on their own comments
- [ ] An anonymous visitor sees existing comments, replies, and reaction counts but the comment input is replaced by a "로그인하고 의견 남기기" prompt; reaction chips are read-only (tapping does nothing for anon)
- [ ] Submitting a comment longer than 1000 characters is rejected with a "1000자까지 작성할 수 있어요" message; the typed text is preserved

### 4. Edit and delete one's own comment
- **Given** an authenticated visitor has written a comment on the page
- **When** the visitor edits the body and saves, or deletes the comment
- **Then** the change is reflected immediately and persists; no other visitor — including the project's owner — can edit or delete that comment

Success Criteria:
- [ ] The author sees edit and delete controls on their own comment only; on other visitors' comments those controls are absent
- [ ] After saving an edit, a "수정됨" indicator appears next to the comment timestamp
- [ ] After deletion, the comment disappears from the list along with all of its replies and reactions
- [ ] A direct request to edit or delete another visitor's comment (e.g. by replaying the request with a different comment id) is rejected by the server
- [ ] The project's owner has no edit/delete control over comments left by other visitors on their own project

### 5. Share a project externally
- **Given** any visitor has a project's detail page open
- **When** the visitor copies the URL and pastes it into a service that renders Open Graph previews (Slack, Twitter/X, Discord, KakaoTalk)
- **Then** the preview shows the project's primary image, title, tagline, and cohort label

Success Criteria:
- [ ] The HTML response for the detail page includes Open Graph tags: `og:title` = project title, `og:description` = tagline, `og:image` = absolute URL of the primary image, `og:url` = canonical detail URL
- [ ] Replacing the primary image (via reorder in the edit dialog) updates `og:image` to the new primary on the next page render
- [ ] The detail URL is stable across edits — changing the title, tagline, images, or GitHub URL does not change the URL

## Invariants

- **Read access is public.** Detail pages, comments, replies, reaction counts, and vote counts are visible to anyone, regardless of authentication.
- **Write access is authenticated.** Posting a comment, posting a reply, adding or removing a reaction, voting, and editing or deleting a comment all require an authenticated session.
- **Comment ownership.** Only the original author may edit or delete a given comment or reply. The project's owner can delete *the project itself* (which removes the page and its discussion) but cannot edit or delete other visitors' comments on it.
- **Reaction toggling.** A single visitor can have at most one of each emoji on a given comment. Tapping an emoji the visitor already added removes it; tapping any of the four fixed emoji adds or removes that visitor's mark in isolation from the other three.
- **Cascade on project delete.** Deleting a project removes its detail page, its images, its comments, its replies, and any reactions on those comments — no orphaned content remains reachable.
- **Image cap.** Every project has between 1 and 5 images at all times. The first image is always treated as primary for board thumbnails and OG.
- **Self-vote rule preserved.** Voting on the detail page follows the existing board rule — one vote per visitor per project, never on one's own project.

## Dependencies
- Authentication (visitors must be able to sign in to comment, reply, react, and vote)
- Existing project board (the board's card click changes from external URL to internal detail navigation)
- Existing project image storage (extends from a single image per project to up to five)

## Undecided Items
(none — all open questions resolved during specification)
