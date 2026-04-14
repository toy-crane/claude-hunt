## Overview
Give Claude Hunt a visual identity inspired by Claude Code — a CLI-native wordmark (`> claude-hunt_`) rendered in terracotta. The product name renders as `claude-hunt` (lowercase kebab) across the whole site. No other theme or typography changes.

## Scope

### Included
- A reusable logo that renders `> claude-hunt_` with a terracotta accent on `>` and `_`
- A favicon asset that reads at 16 / 32 / 180 px
- A social preview (Open Graph) image featuring the logo
- Replacing every visible occurrence of "Claude Hunt" with `claude-hunt` across the app
- Browser tab title shows `claude-hunt` (or a page-specific title ending in `· claude-hunt`)
- The blinking underscore animates on the login page hero only; it is static everywhere else
- Light/dark-mode variants of the logo (terracotta hue shifts slightly lighter in dark mode)

### Excluded
- Theme-wide color change (primary / buttons / focus rings stay as they are today) — that belongs in a later rebrand spec; scoping narrow this round to keep review simple
- Monospace font sprinkling on metadata (upvote counts, tags, timestamps, handles) — same reason; separate follow-up
- Full terminal chrome on cards, modals, or landing hero
- Changes to stored data (database rows, seed content, existing user-submitted text) — only rendered app copy changes
- A custom typeface — we use the already-loaded Geist Mono for the logo itself, and don't touch anything else
- External docs/README copy — this feature covers the running app, not repository documentation

## Scenarios

### 1. Logo renders on the login page
- **Given** — a visitor lands on `/login`
- **When** — the page finishes loading
- **Then** — the CLI-style wordmark replaces the previous "Claude Hunt" text, and the underscore cursor blinks

Success Criteria:
- [ ] The text "Claude Hunt" no longer appears on `/login`; `claude-hunt` appears in its place, prefixed by a terracotta `>`
- [ ] The underscore `_` after `claude-hunt` toggles visible/invisible on a ~1-second cadence
- [ ] The logo is a link to `/` with `aria-label="claude-hunt home"`
- [ ] The logo reads correctly in both light and dark mode (terracotta element is visually distinct against the background)
- [ ] No other element on the login page moves or restyles — button colors, fonts, and layout match the previous page

### 2. Browser tab and favicon
- **Given** — any visitor on any route of the app
- **When** — the browser tab is visible
- **Then** — the tab shows the `claude-hunt` favicon and a title ending in `claude-hunt`

Success Criteria:
- [ ] Loading `/` shows a favicon that is visually recognizable at 16×16 (terracotta square containing the cursor mark)
- [ ] The `<title>` contains `claude-hunt` on every route
- [ ] A 180×180 apple-touch-icon version is served and readable on an iOS home screen
- [ ] Light and dark browsers both render the favicon legibly (no invisible-on-background failure)

### 3. Social share preview
- **Given** — a link to the site is pasted into a social platform that reads Open Graph tags
- **When** — the platform renders the preview card
- **Then** — the preview shows the logo, a short tagline, and the terracotta accent

Success Criteria:
- [ ] The OG image is served at a stable URL and is 1200×630 px
- [ ] The image contains `> claude-hunt_` rendered in monospace with a terracotta `>` and `_`
- [ ] A Facebook/Twitter/Slack-style unfurl shows the image without cropping off the wordmark
- [ ] `og:title` and `twitter:title` include `claude-hunt`

## Invariants
- **Name consistency**: no rendered page displays the old "Claude Hunt" string. Every visible product-name reference is `claude-hunt`. (Stored data is excluded per Scope.)
- **Motion policy**: the blinking cursor appears on every screen that uses the Logo as its page hero. Today that is `/login` and `/onboarding` (see `artifacts/fit-login-onboarding/spec.md`, which supersedes an earlier "login-only" version of this rule). Non-hero Logo placements remain static.
- **No collateral theme changes**: buttons, input styles, focus rings, body fonts, and any other existing visual element is unchanged by this feature.

## Dependencies
- The existing `ThemeProvider` (light/dark toggle) must continue to work; the logo must render in both.
- Geist Mono font loader already configured in `app/layout.tsx` — used inside the logo component, not applied elsewhere.

## Undecided Items
- (none — all open questions were resolved during spec conversation)
