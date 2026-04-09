# Micro-Hunt: Cohort Project Showcase

## Problem Statement

How might we give Claude Code course students a simple, fun stage to
showcase their toy projects — with cohort-based ranking for prizes?

## Recommended Direction

A minimal project showcase built on the existing Supabase auth + profiles.
Single dashboard page with a cohort filter (defaults to latest cohort).
Students submit a project (screenshot + one-line tagline + URL) in under
30 seconds. Any authenticated student can upvote projects Product Hunt
style (but not their own). A live leaderboard shows 1st, 2nd, 3rd for
prize allocation. The public can browse but not vote.

### Key Design Decisions

- **Single page + filter over separate cohort pages.** Simplest implementation;
  one route, one component. Can refactor to `/projects/[cohort]` later if
  linkability becomes important.
- **Filter defaults to latest cohort.** Solves leaderboard confusion — top 3
  always maps to the current prize structure.
- **Radically simple post format.** One screenshot, one sentence, one link.
  Barrier to sharing is near-zero. Volume is guaranteed since every student
  is required to post.
- **Public read, auth-gated voting.** Anyone can browse; only authenticated
  students can upvote.
- **Always-open voting, no deadline.** Reduces complexity. Add a deadline
  mechanism later if gaming becomes a problem.

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
- Single dashboard page (`/projects`) with cohort filter dropdown
- Project card grid sorted by vote count
- Upvote button (authenticated students only, not own project)
- Leaderboard: top 3 highlighted with rank badges (1st/2nd/3rd)
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
- **Separate cohort routes** — single page + filter is sufficient at current scale;
  refactor to dynamic routes if linkability becomes important

## Open Questions

- What's the max number of upvotes per voter per cohort? (Unlimited vs. capped)
- Should past cohort showcases remain visible or archive after a period?
- Does the instructor need an override to adjust rankings?
