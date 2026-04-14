# Project Board: Cohort Project Showcase

## Problem Statement

How might we give Claude Code course students a simple, fun stage to
showcase their toy projects — with cohort-based ranking for prizes?

## Recommended Direction

A minimal project showcase built on the existing Supabase auth + profiles.
The showcase serves as the app's landing page (`/`) with an optional cohort
filter. Students submit a project (screenshot + one-line tagline + URL) in
under 30 seconds. Any authenticated student can upvote projects Product Hunt
style (but not their own). A leaderboard highlights the top 3 with minimal
rank badges, adapting to the active filter. The public can browse but not vote.

### Key Design Decisions

- **Landing page at `/`.** The project showcase is the default page of the
  entire app. No separate route needed.
- **No default filter.** All projects across all cohorts are visible on first
  visit. Users can filter by cohort via dropdown.
- **Radically simple post format.** One screenshot, one sentence, one link.
  Barrier to sharing is near-zero. Volume is guaranteed since every student
  is required to post.
- **Public read, auth-gated voting.** Anyone can browse; only authenticated
  students can upvote.
- **Always-open voting, no deadline.** Reduces complexity. Add a deadline
  mechanism later if gaming becomes a problem.
- **Leaderboard adapts to filter.** Top 3 shown for every view — global top 3
  when unfiltered, cohort top 3 when a cohort is selected.

## Key Assumptions to Validate

- [ ] Upvotes from all cohorts produce a fair ranking (vs. only same-cohort voting)
- [ ] Always-open voting doesn't lead to gaming or stale leaderboards
- [ ] Screenshot + tagline is enough for voters to evaluate projects
- [ ] Self-vote prevention is sufficient (no need for anti-collusion measures)

## MVP Scope

**In:**

- `cohorts` table (id, name, created_at)
- `projects` table (id, user_id, cohort_id, title, tagline, screenshot_url, project_url, created_at)
- `votes` table (id, user_id, project_id, unique constraint per user+project)
- Project submission form (image upload + tagline + URL)
- Landing page at `/` with cohort filter dropdown (no default filter)
- Project card grid sorted by vote count
- Upvote button (authenticated students only, not own project)
- Leaderboard: top 3 with minimal rank badges (1st/2nd/3rd), adapts to
  active filter (global or per-cohort)
- Public browsing (no auth required to view)
- RLS: users manage own projects, one vote per project, public read
- Supabase Storage for screenshot uploads

**Out (for now):**

- Separate pages per cohort
- Comments / feedback
- Categories / tags
- Scheduled launch days
- Admin panel for cohort management (seed via migration)
- Rich project detail pages

## Not Doing (and Why)

- **Comments** — adds moderation burden; feedback happens in class, not here
- **Voting deadline** — unnecessary complexity; add later if gaming appears
- **Project detail pages** — the URL links out; no need to duplicate content
- **Admin dashboard** — cohorts are low-frequency; manage via DB/migration
- **Separate cohort routes** — single landing page + filter is sufficient at
  current scale; refactor to dynamic routes if linkability becomes important

## Resolved Questions

- **Upvotes per voter:** Unlimited — no cap per cohort.
- **Past cohort visibility:** Always visible — no archiving.
- **Instructor ranking override:** No — rankings are purely vote-driven.
