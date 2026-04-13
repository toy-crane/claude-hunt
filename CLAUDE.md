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
- Tests: `bun run test`

### Commit Rules
- Commit per logical unit of work; do not mix unrelated changes
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Question Rules
- Always use the AskUserQuestion tool for multiple-choice questions

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

**Aliases**: `@core/*`, `@features/*`, `@entities/*`, `@shared/*`. Next.js `app/` stays as the router — FSD `pages` layer is dropped in favor of Next.js `app/*/page.tsx`, and FSD's original `app` layer is renamed to `core/` to avoid conflict.

### Slice rules

- **Public API**: every slice exposes its surface via `index.ts`. External code imports from `@features/auth-login` (the barrel), never from `@features/auth-login/ui/login-form` (internal path). Slice-internal tests may use relative imports.
- **Slice isolation**: cross-slice imports on the same layer are forbidden. `features/A` cannot import `features/B`; `entities/X` cannot import `entities/Y`. Shared logic belongs in `shared/` (promote up, never sideways).
- **Server actions**: Next.js server actions live in `features/<slice>/api/*.ts` with `'use server'`. Not in `app/`. Route handlers (`route.ts`) remain in `app/` because Next.js routing requires them there.

### Infrastructure boundary

`supabase/` sits **outside** the FSD tree (migrations, schemas, pgTAP tests). Each `entities/<name>/` slice pairs 1:1 with `supabase/schemas/<names>.sql` (singular entity, plural table).

The raw Supabase-generated `Database` type lives at `shared/api/supabase/types.ts`. Domain code must import narrowed types from `@entities/<slice>` (e.g. `Profile` from `@entities/profile`), never the raw file. Biome enforces this via `noRestrictedImports`.

**Biome rule limitation**: Biome cannot express directional (`from A, block B`) rules, so feature-to-feature imports and `supabase.from("table")` row-type leakage are not lint-caught. Rely on code review.

## Boundary

### Ask-first
- Adding new external dependencies
