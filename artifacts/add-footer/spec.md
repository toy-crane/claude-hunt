## Overview
Add a site footer to the home page (`/`) so visitors can find the copyright notice, send feedback via a GitHub issue, browse the source repository, and visit the creator's site. Scoped to the home page this round, mirroring the current header scope.

## Scope

### Included
- A footer mounted on the home page (`/`) only this round
- Copyright text on the left: `© <current year> claude-hunt`
- Three links on the right, in order:
  - **GitHub** — a "GitHub" label paired with the GitHub icon, links to the repository home, opens in a new tab
  - **Feedback** — opens the GitHub repository's "new issue" page in a new tab
  - **Creator** — labelled with the creator's name and links to `https://toycrane.xyz`, opens in a new tab
- Static placement at the bottom of the page (scrolls with content; not fixed/sticky)

### Excluded
- Mounting the footer on `/login`, `/onboarding`, `/settings`, or any other route — the user requested home only this round
- Newsletter signup, social media icons beyond GitHub, language switcher, or sitemap — not requested
- Theme toggle in the footer — already handled in the header avatar dropdown
- Sticky/fixed footer behavior — static is sufficient at current scale

## Scenarios

### 1. Visitor sees the footer at the bottom of home
**Given** any visitor (signed-in or signed-out) lands on `/`
**When** the page finishes loading
**Then** the footer is rendered at the bottom of the page content with copyright on the left and the three links on the right

Success Criteria:
- [ ] Footer is visible at the bottom of `/` after the project board section
- [ ] Copyright text reads `© 2026 claude-hunt` (year matches the current calendar year at render time)
- [ ] Footer is rendered identically for signed-in and signed-out visitors
- [ ] Footer scrolls with the page (it does not stay fixed at the viewport bottom)
- [ ] Footer is not rendered on `/login`, `/onboarding`, or `/settings`

### 2. Visitor clicks Feedback to file a GitHub issue
**Given** a visitor is viewing the footer on `/`
**When** the visitor clicks the "Feedback" link
**Then** the GitHub repository's new-issue page opens in a new browser tab

Success Criteria:
- [ ] "Feedback" link is visible in the footer
- [ ] Clicking it navigates to `https://github.com/toy-crane/claude-hunt/issues/new`
- [ ] The link opens in a new tab and the original `/` tab remains on the home page

### 3. Visitor clicks GitHub to view the repository
**Given** a visitor is viewing the footer on `/`
**When** the visitor clicks the "GitHub" link
**Then** the repository's home page opens in a new browser tab

Success Criteria:
- [ ] A "GitHub" link is visible in the footer, paired with a recognisable GitHub icon
- [ ] Clicking it navigates to `https://github.com/toy-crane/claude-hunt`
- [ ] The link opens in a new tab

### 4. Visitor clicks the creator link
**Given** a visitor is viewing the footer on `/`
**When** the visitor clicks the creator link
**Then** the creator's personal site opens in a new browser tab

Success Criteria:
- [ ] A creator link labelled with the creator's name (e.g., "toycrane") is visible in the footer
- [ ] Clicking it navigates to `https://toycrane.xyz`
- [ ] The link opens in a new tab

## Invariants
- Every external link in the footer opens in a new tab and uses safe rel attributes appropriate for cross-origin links (no opener leakage to the destination).
- The copyright year always reflects the current calendar year at render time — it does not display a stale hard-coded year after the year rolls over.

## Dependencies
- The home page (`/`) layout into which the footer will be appended.

## Undecided Items
- None
