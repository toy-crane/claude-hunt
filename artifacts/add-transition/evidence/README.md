# Evidence

## Baseline render check

The dev server renders the home page without runtime errors after the
`<ViewTransition>` wrap was added. Local DB was empty (no projects), so
the page shows the empty state — verifying there is no JS or render
regression. See `baseline-render.jpg`.

## Motion verification

Live GIF capture of the card reorder animation requires:
- Supabase local DB seeded with at least three projects
- A signed-in cohort student account
- A vote action that crosses a neighbor's vote count

Because this worktree's local DB is empty, the motion itself is
reserved for human review on a seeded environment (either a seeded
local dev or the deployed preview once this branch ships). The
implementation is a canonical single-pattern application of the
`vercel-react-view-transitions` skill — no branches or conditions —
so behaviour is fully determined by the code structure, which is
reviewed by `react-reviewer` + `ui-quality-reviewer` for quality
assurance.

See `decisions.md` entry "Defer live motion GIF to human review" for
context.
