## Site

- Production URL: `https://www.claude-hunt.com`

## Workflow Phases

Define → Sketch → Plan → Build

### Spec-Driven Development

- Use for product features that are ambiguous, multi-file, or take over 30 minutes.
- Skip for single-line fixes, unambiguous changes, or meta-tooling (skills, rules, hooks, repo config).

| Phase | Skill / Command |
|-------|----------------|
| Specify | `/write-spec` skill |
| Sketch | `/sketch-wireframe` skill |
| Plan | `/draft-plan` skill |
| Build | `/execute-plan` skill |

Each phase has a human review gate. Do not advance until the current phase is validated.

## Linear

- Linear is the single source of truth for every new requirement in this repo. All new bugs, features, refactors, chores, and docs work — including meta-tooling (skills, hooks, rules) — start as Linear issues in the `claude-hunt` team.
- Use the `capture-issue` skill (triggers: `capture`, `캡쳐`, `이슈 만들어`, etc.) to create issues. Do not call `save_issue` directly for new issues — the skill enforces team and label defaults.
- Use the `triage-issues` skill to classify Backlog issues for AI delegation. Only `ai-ready` issues are dispatch candidates.
- Use the `dispatch-issue` skill (designed for Desktop scheduled task with worktree isolation) to auto-pick the oldest `ai-ready` issue, implement it, and open a PR. Failed dispatches receive the `dispatch-failed` label.
- Allowed labels (team-scoped on `claude-hunt`):
  - **Category** (exactly one per issue): `bug`, `feat`, `refactor`, `chore`, `docs`
  - **Triage** (at most one per issue): `ai-ready`, `needs-human`, `needs-clarification`
  - **Dispatch status** (at most one per issue): `dispatch-failed`
- Team id: `400292c4-1535-4271-81df-e7b83257a207`. Issue identifiers: `CLA-N`.

## Development Workflow

- Package manager: `bun`

### Commit Rules
- Commit per logical unit of work; do not mix unrelated changes
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Question Rules
- Always use the AskUserQuestion tool for multiple-choice questions

## Testing

### Principle
**Define success criteria. Loop until verified.**

Every change needs measurable success criteria — concrete input → observable outcome. Each criterion must have a test that proves it. Without a passing test, the criterion is not met.

Pick the lowest boundary where the criterion is actually provable. If a mock would obscure what the criterion is about (real DB state, RLS, auth, cross-page flow), don't mock there — let the test hit the real dependency.

### Stack & file placement
- **Vitest** (jsdom, `@testing-library/react`) — colocated `<file>.test.tsx` next to `<file>.tsx` (e.g. `features/auth-login/ui/login-form.test.tsx`, `app/dashboard/page.test.tsx`)
- **pgTAP** — `supabase/tests/*_test.sql`
- **Playwright** (real browser + real Supabase) — `e2e/*.spec.ts` (not colocated; flows span features, and `.spec.ts` distinguishes from Vitest's `.test.{ts,tsx}`)

Shared helpers live in `shared/lib/test-utils.tsx` (e.g. `createMockSupabaseClient`, `renderServerComponent`) — extend, do not duplicate.

### Naming
Test names describe the behavior in natural language — do not use scenario IDs.

### Commands
| Command | Scope |
|---------|-------|
| `bun run test` | Vitest + pgTAP (fast tier) |
| `bun run test:unit` | Vitest only |
| `bun run test:db` | pgTAP only |
| `bun run test:e2e` | Playwright (requires Supabase running) |
| `bun run test:e2e:ui` | Playwright with UI mode |
| `bun run test:watch` | Vitest watch mode |
| `bun run test:coverage` | Vitest with v8 coverage |

### E2E preconditions
- `supabase start` running (API on `:54321`)
- `.env.local` contains `SUPABASE_SECRET_KEY` (copy from `supabase status`) — required server env, validated at app boot
- `bunx playwright install chromium` (once)

## Architecture — Feature-Sliced Design (FSD)

### Core rules

- **Domain-first**: organize by business domain first, technical role second.
- **Bottom-up**: implement from least to most dependent.
- **No reverse dependencies**: higher layers import lower; never the reverse.

### Layers

| Order | Layer | Role | Allowed Dependencies |
|-------|-------|------|----------------------|
| 1 | `shared/` | Domain-agnostic utilities, UI kit, HTTP clients | (none) |
| 2 | `entities/` | Domain objects (types, default UI) — `Profile`, `Project`, etc. | shared |
| 3 | `features/` | User-facing actions (`auth-login`, `submit-project`, `toggle-vote`) | entities, shared |
| 4 | `widgets/` | Composed UI blocks reused across pages | features, entities, shared |
| 5 | `core/` | App-wide providers, bootstrap wiring | shared |
| 6 | `app/` | Next.js routing + page composition | all of the above |

**Aliases**: `@core/*`, `@features/*`, `@entities/*`, `@shared/*`.

### Slice rules

- **Public API**: every slice exposes its surface via `index.ts` (barrel). External code uses `@features/auth-login`, never internal paths. Slice-internal tests may use relative imports.
- **Slice isolation**: cross-slice imports on the same layer are forbidden. Shared logic belongs in `shared/` (promote up, never sideways).
- **Server actions**: belong in `features/`, not `app/`. Route handlers (`route.ts`) stay in `app/` — Next.js routing requires it.

### Infrastructure boundary

`supabase/` sits **outside** the FSD tree. Each `entities/<name>/` slice pairs 1:1 with `supabase/schemas/<names>.sql` (singular entity, plural table).

The raw `Database` type lives at `shared/api/supabase/types.ts`. Domain code must import narrowed types from `@entities/<slice>`, never the raw file.

## Boundary

_No ask-first boundaries currently defined._
