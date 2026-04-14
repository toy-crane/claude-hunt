## Overview
A minimal project showcase that serves as the app's landing page. Students submit toy projects (screenshot + title + tagline + URL), browse across cohorts, and upvote favorites Product Hunt style. A leaderboard highlights the top 3 with rank badges, adapting to the active cohort filter.

## Scope

### Included
- A landing page that shows all submitted projects as cards in a grid
- A cohort filter that narrows the grid to one cohort's projects
- Rank badges (1st / 2nd / 3rd) on the top three cards within whatever set is currently shown
- A submission form (title, tagline, project URL, screenshot upload) for cohort-assigned students
- Edit and delete actions on a student's own projects
- A one-click upvote toggle on other students' projects, with an "upvoted" visual state
- An empty-state message when nothing matches

### Excluded
- Comments or feedback — moderation burden; feedback happens in class
- Voting deadline — unnecessary complexity; add later if gaming appears
- Project detail pages — the project URL links out; no need to duplicate content
- Admin dashboard for cohorts — cohorts are low-frequency; manage via DB / migration
- Separate routes per cohort — single landing + filter is sufficient at current scale
- Avatar display on cards — keep it minimal with display name only
- Onboarding flow for cohort selection — future feature
- Screenshot aspect-ratio enforcement or cropping — rely on object-fit behavior

## Scenarios

### 1. Browse the project grid (any visitor)
**Given** the landing page has projects from one or more students
**When** any visitor (signed-in or not) opens the page
**Then** the projects render as cards sorted by vote count, highest first

Success Criteria:
- [ ] 5 projects exist → grid renders 5 cards in vote-count-descending order
- [ ] Each card shows: screenshot, title, tagline, author display name, vote count
- [ ] The top three cards display "1st", "2nd", "3rd" rank badges respectively
- [ ] Only 2 projects exist → only "1st" and "2nd" badges are shown

### 2. Filter the grid by cohort
**Given** projects exist across multiple cohorts
**When** the visitor selects a cohort from the cohort dropdown
**Then** the grid narrows to that cohort's projects with rank badges recalculated

Success Criteria:
- [ ] On first visit → no cohort is selected and all cohorts' projects appear
- [ ] Select "Cohort A" → only Cohort A projects render in the grid
- [ ] Top 3 badges recalculate within the filtered set
- [ ] Clear the cohort selection → all projects re-appear with global top-3 badges

### 3. Submit a project
**Given** a signed-in student is on the landing page and has been assigned to a cohort
**When** the student opens the submission form, fills in title, tagline, project URL, picks a screenshot, and presses Submit
**Then** a new card appears in the grid, attributed to the student under their cohort

Success Criteria:
- [ ] title="My App", tagline="A cool tool", url="https://myapp.com", valid screenshot → a card with that title and tagline appears in the grid
- [ ] Any required field empty (e.g. title="") → submission is rejected with a validation error
- [ ] Screenshot larger than 5 MB → an error message about size limits appears
- [ ] Screenshot in any format other than JPEG, PNG, or WebP (e.g. .gif) → an error message about supported formats appears
- [ ] Accepted screenshot formats: JPEG, PNG, WebP up to 5 MB

### 4. Block submission for students without a cohort — OBSOLETE

**Obsoleted by `artifacts/onboarding-process/spec.md` scenario 1 on
2026-04-14.** A signed-in student without a cohort can no longer reach
this page — the onboarding gate (middleware + `/onboarding` route)
redirects them to complete onboarding first. The submission form no
longer renders the "Contact your instructor" banner.

### 5. Manage own project (edit and delete)
**Given** a signed-in student is viewing a project they submitted
**When** the student edits any field, or deletes the project after confirming
**Then** the grid reflects the change

Success Criteria:
- [ ] Student viewing their own card → edit and delete options are visible
- [ ] Student viewing another student's card → edit and delete options are not visible
- [ ] Edit tagline from "A cool tool" to "An awesome tool" → the card now shows "An awesome tool"
- [ ] Press delete → a confirmation prompt appears
- [ ] Confirm delete → the card disappears from the grid
- [ ] Cancel delete → the card remains in the grid

### 6. Vote on projects
**Given** a signed-in student is browsing projects submitted by others
**When** the student presses the upvote button on a card, then presses it again
**Then** the vote count and button state reflect each toggle

Success Criteria:
- [ ] Card has 3 votes, student has not voted, press upvote → vote count becomes 4, button shows "upvoted" state
- [ ] Card has 4 votes, student has already upvoted, press upvote again → vote count becomes 3, button returns to default state
- [ ] Student viewing their own card → upvote button is hidden
- [ ] Unauthenticated visitor viewing any card → vote count is shown but the upvote button is replaced with a "Sign in to vote" prompt

### 7. Empty state
**Given** there are no projects to show (overall, or under the active cohort filter)
**When** the visitor lands on the page or applies the filter
**Then** the grid area shows a friendly empty-state message instead of cards

Success Criteria:
- [ ] No projects exist anywhere → "No projects yet" message is displayed
- [ ] Cohort filter active and no projects match → "No projects yet" message is displayed

## Invariants
- A student can only edit, delete, or claim ownership of projects they submitted. No path (UI, direct request, or otherwise) lets one student act on another student's project.
- Each (student, project) pair holds at most one upvote at any point in time.
- The vote count shown on a card always equals the actual number of upvotes recorded for that project at the moment of render.

## Dependencies
- Authentication (students can sign in and the system knows who is currently signed in)
- A mechanism for assigning a student's profile to a cohort (the assignment itself happens outside this feature)

## Undecided Items
- None
