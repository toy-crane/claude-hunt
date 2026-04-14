## Site

- Production URL: `https://www.claude-hunt.com`

## Workflow Phases

Define → Plan → Build → Verify → Review → Ship

### Spec-Driven Development

Use when starting a new project or feature, requirements are ambiguous, the change touches multiple files, or the task would take more than 30 minutes. Skip for single-line fixes or unambiguous changes.

| Phase | Skill / Command |
|-------|----------------|
| Specify | `/write-spec` skill |
| Plan | `/draft-plan` skill |
| Build | `/execute-plan` skill |
| Verify | `/test` skill |
| Review | `/review` skill |
| Ship | `/ship` skill |

Each phase has a human review gate. Do not advance until the current phase is validated.

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
- `.env.local` contains `SUPABASE_SECRET_KEY` (copy from `supabase status`)
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

### Ask-first
- Adding new external dependencies
