# Repo integration — claude-hunt

The core skill is repo-agnostic and stays that way. This file is the
composition layer for **this** repo: the facts recon would otherwise
rediscover every run, the audit lenses specific to our stack, and the one
place the generic workflow must bend to ours. Read it during Recon (Phase 1)
and carry it into Vet and the plans. Everything here is additive — if a fact
below has drifted from the actual repo, trust the repo and flag the drift.

## Verification commands (bun)

These are the exact gates. Every plan's "Commands you will need" table and
"Done criteria" draw from this list — never guess a command, copy from here.

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `bun run typecheck` | exit 0, no errors (`tsc --noEmit`) |
| Lint + format check | `bun run check` | exit 0 (`ultracite check`) |
| Autofix lint/format | `bun run fix` | only inside an executor worktree, never the user's tree |
| Unit tests (Vitest) | `bun run test:unit` | all pass (`--passWithNoTests` tolerated) |
| DB tests (pgTAP) | `bun run test:db` | all pass — needs `supabase start` |
| Fast tier (unit + db) | `bun run test` | all pass |
| E2E (Playwright) | `bun run test:e2e` | all pass — needs `supabase start` + `.env.local` `SUPABASE_SECRET_KEY` |
| Coverage | `bun run test:coverage` | report generated |

A plan that touches DB or auth must list `test:db` / `test:e2e` as a gate and
must state the `supabase start` precondition — the executor has zero context
and will otherwise run a green `test:unit` and call it done.

## Architecture lens — Feature-Sliced Design

Audit tech-debt and correctness against the FSD rules in `CLAUDE.md`. Each
violation below is a concrete, citable finding, not a style nit:

- **Reverse dependency** — a lower layer importing a higher one (e.g. `shared/`
  importing from `features/`). Layer order: `shared → entities → features →
  widgets → core → app`. Higher imports lower, never the reverse.
- **Sideways cross-slice import** — two slices on the same layer importing each
  other (e.g. `features/auth-login` importing `features/submit-project`
  internals). Shared logic must be promoted to `shared/`, never passed sideways.
- **Bypassed public API** — importing a slice's internal path instead of its
  `index.ts` barrel (`@features/x/ui/...` instead of `@features/x`).
- **Server action in the wrong layer** — server actions belong in `features/`,
  not `app/`. Route handlers (`route.ts`) are the only server code that stays in
  `app/` (Next.js requires it).
- **Raw `Database` type leak** — domain code importing
  `shared/api/supabase/types.ts` directly instead of the narrowed type from
  `@entities/<slice>`.

Plans that move or create files must name the target layer and slice, and tell
the executor to expose new surface via the slice's `index.ts`.

## Supabase guards — correctness + security lens

These repo rules (`.claude/rules/supabase-*.md`) turn into findings when broken,
and into hard constraints inside any plan that touches the database:

- **Hand-written migration** — any change authored directly in
  `supabase/migrations/` for a schema change is a violation. The flow is: edit
  `supabase/schemas/*.sql`, then `supabase db diff -f <name>`. A plan that
  changes schema instructs the executor to edit `schemas/` and diff — never to
  write migration SQL by hand.
- **Missing timestamp columns / trigger** — every `public.*` table needs
  `created_at` and `updated_at` (`timestamptz`, last two columns) plus a
  `moddatetime` trigger calling `extensions.moddatetime(updated_at)`. A table
  missing any of these is a correctness finding.
- **Storage bucket without an upsert migration** — a bucket declared only in
  `config.toml` never reaches remote; flag the missing idempotent upsert
  migration.

When a finding cites a migration diff, apply the repo's Post-Diff Review
checklist (cross-schema DROPs, extension DROPs, view-recreate losing
`security_invoker`) before claiming it as a bug — those are diff-tool noise,
not regressions.

## User-facing strings lens — UX writing

Any finding or plan that touches user-visible copy (JSX text, toasts, zod
validation messages, placeholders, `aria-label`, dialogs, empty states,
`metadata` title/description, OG text) must honor `.claude/rules/ux-writing.md`:
Korean only (proper nouns like GitHub / Claude Code excepted), 해요체 (never
합니다체), active voice, "next-screen-predicting" button labels. Developer logs
and internal `throw` messages are exempt.

Plan rule: when a plan changes a string, it must change the test that asserts
that string (`*.test.tsx`, `e2e/*.spec.ts`) **in the same commit** — list both
in scope, or the executor ships a red suite.

## shadcn guard

Do not flag, and do not let a plan introduce, direct edits to `components/ui/*`
or style overrides via `className`. Style changes go through variant props →
semantic tokens → CSS variables, per `.claude/rules/shadcn-guard.md`.

## Handoff — Linear is the single source of truth

This is the one place the core skill's workflow bends to ours. `CLAUDE.md`:
*Linear is the single source of truth for every new requirement … `capture-issue`
is the only intake gate. Do not call `save_issue` directly for new issues.*

Consequences for this skill in this repo:

- **`--issues` (GitHub) is disabled here.** Do not publish findings as GitHub
  issues — it bypasses the mandated intake gate. If a user passes `--issues`,
  say it's disabled in this repo and offer `--linear` instead.
- **`--linear` (this repo's publish flag)** — for each selected finding, invoke
  the **`capture-issue`** skill (which enforces the Claude Hunt team and label
  defaults) to create the Linear issue, and record the resulting `CLA-N`
  identifier in the plan's Status block (`- **Issue**: CLA-N`) and the index.
  The `plans/` file stays the source of truth for the spec; Linear carries the
  work item. Never call `save_issue` directly — always go through
  `capture-issue`.
- **Where this skill sits in the loop.** `improve` is the audit/specify front
  end. The repo's own loop continues it: `capture-issue` (intake) → `triage`
  (classify, mark `ai-ready`) → `dispatch-issue` (work it in a worktree → PR).
  So the canonical executor for a planned finding is **`dispatch-issue` via a
  Linear issue**, not this skill's own `execute`. `execute` remains available
  for ad-hoc local dispatch + review, but prefer routing real work through
  `--linear` so it lands where the team already works.

## Recon shortcuts

- Intent/convention docs already maintained here — read them, don't re-derive:
  `CLAUDE.md` (architecture, workflow, testing), `.claude/rules/*.md`
  (ux-writing, supabase-timestamps, supabase-migration, shadcn-guard),
  `docs/agents/*.md` (triage labels, issue-tracker conventions).
- A tradeoff recorded in `.claude/rules/` or `docs/agents/` is **by-design** —
  do not surface it as a finding (e.g. `supabase/` living outside the FSD tree
  is intentional, not a layering violation).
- `plans/` is this skill's workspace. If it doesn't exist, create it; reconcile
  with any existing `plans/README.md` rather than duplicating.
