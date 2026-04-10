## Overview
A minimal project showcase that serves as the app's landing page. Students submit toy projects (screenshot + title + tagline + URL), browse across cohorts, and upvote favorites Product Hunt style. A leaderboard highlights the top 3 with rank badges, adapting to the active cohort filter.

## Scenarios

### 1. Browse project grid (public)
[Context] Any visitor (authenticated or not) opens the landing page
[Action] The system displays a grid of project cards sorted by vote count descending. Each card shows the screenshot, title, tagline, author display name, and vote count. The top 3 cards display rank badges (1st/2nd/3rd).

Success Criteria:
- [ ] Visiting `/` with 5 projects -> grid shows 5 cards sorted by vote count descending
- [ ] The card with the highest votes shows a 1st-place badge
- [ ] Each card displays: screenshot image, title, tagline, author display name, vote count

### 2. Filter by cohort
[Context] A visitor is on the landing page viewing all projects
[Action] Selecting a cohort from the dropdown filters the grid to only that cohort's projects. The top 3 badges recalculate for the filtered set. Clearing the filter restores all projects.

Success Criteria:
- [ ] No default filter on first visit -> all projects from all cohorts are shown
- [ ] Selecting "Cohort A" -> only Cohort A projects are displayed
- [ ] Top 3 badges recalculate when a cohort filter is applied
- [ ] Clearing the filter -> all projects are shown again with global top 3

### 3. Submit a project (authenticated, has cohort)
[Context] An authenticated student with a cohort assigned navigates to the submission form
[Action] The student fills in the title, tagline, project URL, and uploads a screenshot, then submits. The project appears in the grid under their cohort.

Success Criteria:
- [ ] Submitting with title "My App", tagline "A cool tool", URL "https://myapp.com", and a valid screenshot -> project card appears in the grid
- [ ] Screenshot upload accepts JPEG, PNG, WebP up to 5MB
- [ ] Upload of a 6MB file -> error message displayed
- [ ] Upload of a .gif file -> error message displayed
- [ ] Submitting with any required field empty -> validation error shown

### 4. Block submission without cohort
[Context] An authenticated student whose profile has no cohort_id tries to submit a project
[Action] The system blocks submission and displays a message directing them to contact their instructor.

Success Criteria:
- [ ] Student with no cohort_id visits submission form -> "Contact your instructor to get assigned to a cohort" message displayed, submit button disabled

### 5. Edit own project
[Context] An authenticated student views a project card they submitted
[Action] The student can edit the title, tagline, project URL, or screenshot. Changes are saved and reflected in the grid.

Success Criteria:
- [ ] Project owner sees an edit option on their own card
- [ ] Changing tagline from "A cool tool" to "An awesome tool" -> card displays "An awesome tool"
- [ ] Non-owner does not see the edit option

### 6. Delete own project
[Context] An authenticated student views a project card they submitted
[Action] The student can delete the project. The card is removed from the grid.

Success Criteria:
- [ ] Project owner sees a delete option on their own card
- [ ] Clicking delete -> confirmation prompt appears
- [ ] Confirming delete -> card is removed from the grid
- [ ] Non-owner does not see the delete option

### 7. Upvote a project (authenticated, not own)
[Context] An authenticated student views a project card submitted by someone else
[Action] Clicking the upvote button adds a vote. The vote count increments by 1 and the button shows an "upvoted" state.

Success Criteria:
- [ ] Clicking upvote on another's project -> vote count changes from 3 to 4, button shows upvoted state
- [ ] Upvote button is hidden on own projects

### 8. Remove upvote (toggle)
[Context] An authenticated student has already upvoted a project
[Action] Clicking the upvote button again removes the vote. The vote count decrements by 1 and the button returns to its default state.

Success Criteria:
- [ ] Clicking upvoted button -> vote count changes from 4 to 3, button returns to default state

### 9. Public cannot vote
[Context] An unauthenticated visitor views the project grid
[Action] The upvote button is not shown. The visitor can browse and view vote counts but cannot vote.

Success Criteria:
- [ ] Unauthenticated visitor sees project cards with vote counts but no upvote button
- [ ] Unauthenticated visitor sees a "Sign in to vote" prompt or the upvote area is absent

### 10. Empty state
[Context] The landing page loads with no projects in the database (or no projects matching the active filter)
[Action] The system displays an empty state message.

Success Criteria:
- [ ] No projects exist -> "No projects yet" message displayed
- [ ] Cohort filter active with no matching projects -> "No projects yet" message displayed

## Scope

### Included
- `cohorts` table (id, name, created_at)
- `projects` table (id, user_id, cohort_id, title, tagline, screenshot_url, project_url, created_at, updated_at)
- `votes` table (id, user_id, project_id, created_at, unique constraint on user_id + project_id)
- `profiles.cohort_id` nullable foreign key to cohorts
- Supabase Storage bucket for screenshot uploads (JPEG, PNG, WebP, max 5MB)
- RLS: public read on projects/votes/cohorts, authenticated insert/update/delete own projects, one vote per user per project with toggle
- Landing page at `/` replacing current placeholder
- Project card grid with responsive columns, sorted by vote count
- Cohort filter dropdown (no default filter)
- Rank badges on top 3 cards (adapts to active filter)
- Project submission form (title, tagline, URL, screenshot upload)
- Project edit form (same fields as submission)
- Project delete with confirmation
- Upvote toggle button (hidden on own projects, hidden for unauthenticated)

### Excluded
- Comments / feedback — moderation burden; feedback happens in class
- Voting deadline — unnecessary complexity; add later if gaming appears
- Project detail pages — URL links out; no need to duplicate content
- Admin dashboard — cohorts are low-frequency; manage via DB/migration
- Separate cohort routes — single landing + filter sufficient at current scale
- Avatar display on cards — keeping it minimal with display name only
- Onboarding form for cohort selection — future feature
- Screenshot aspect ratio enforcement / cropping — relying on object-fit: cover

## Prerequisites
- Supabase auth and profiles table (existing)
- Supabase Storage configured
- shadcn/ui components available (existing)

## Undecided Items
- None
