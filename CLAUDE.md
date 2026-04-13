## Workflow Phases

Define → Plan → Build → Verify → Review → Ship

### Spec-Driven Development

Use when starting a new project or feature, requirements are ambiguous, the change touches multiple files, or the task would take more than 30 minutes. Skip for single-line fixes or unambiguous changes.

| Phase | Skill / Command |
|-------|----------------|
| Specify | `/write-spec` skill |
| Plan | `/draft-plan` skill |
| Build | `/build` command |
| Verify | `/test` command |
| Review | `/review` command |
| Ship | `/ship` command |

Each phase has a human review gate. Do not advance until the current phase is validated.

## Development Workflow

- Package manager: `bun`

### Commit Rules
- Commit per logical unit of work; do not mix unrelated changes
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Question Rules
- Always use the AskUserQuestion tool for multiple-choice questions

## Test Infrastructure

### Stack
- **Unit / component**: Vitest + jsdom + `@testing-library/react`
- **Database**: pgTAP (`supabase/tests/*_test.sql`)
- **E2E**: not yet installed — requires `/write-spec` and user approval before adding a browser-testing dependency (e.g. Playwright)

### File Placement
- **Colocation is the default**: `<file>.test.tsx` next to `<file>.tsx` (e.g. `features/auth-login/ui/login-form.test.tsx`, `app/dashboard/page.test.tsx`)
- **Shared helpers**: `shared/lib/test-utils.tsx` (`createMockSupabaseClient`, `renderServerComponent`) — extend, do not duplicate

### Naming
- Test names use natural language describing the behavior; **do not** use scenario IDs

### Commands
| Command | Scope |
|---------|-------|
| `bun run test` | Full suite — Vitest + pgTAP |
| `bun run test:unit` | Vitest only |
| `bun run test:db` | pgTAP only |
| `bun run test:watch` | Vitest watch mode |
| `bun run test:coverage` | Vitest with v8 coverage |

## Architecture — Feature-Sliced Design (FSD)

Organize code **by business domain first, technical role second**. Implement from least to most dependent; reverse dependencies are forbidden.

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
