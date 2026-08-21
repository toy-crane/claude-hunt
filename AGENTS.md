## Site

- Production URL: `https://www.claude-hunt.com`

## Project Context

- Before changing product behavior, terminology, data ownership, or schema, read `GLOSSARY.md` and use `docs/decisions/README.md` to load the relevant decision contract.
- Treat those files as the durable project source of truth. If a request conflicts with them, surface the conflict instead of silently changing the decision.

## Product Workflow

Product context → Shape → Prototype (when needed) → Split (when needed) → Implement

- Use `define-product` only for app-wide product direction and durable product boundaries.
- Use `shape-idea` to settle one work unit and write its implementation-ready spec.
- Use `build-prototype` when a complete screen-based surface needs visual review before implementation.
- Use `split-into-tasks` only when a settled spec has multiple independently deliverable outcomes.
- Use `implement` to complete a selected `docs/specs/<slug>/` handoff.
- Skip shaping for single-line fixes, unambiguous changes, or meta-tooling such as skills, rules, hooks, and repository configuration.

Each skill owns its review boundary. Do not require optional prototype or task-splitting phases when their trigger does not apply.

## Work Management

- Keep durable work state in the repository. Do not create or mirror a backlog in an external issue tracker.
- Record app-wide product direction in root `PRODUCT.md` through `define-product`.
- Record settled implementation work in `docs/specs/<slug>/spec.md` through `shape-idea`; add task files through `split-into-tasks` only when the work has multiple independently deliverable outcomes.
- Record evidence-backed temporary workarounds and out-of-scope defects in `docs/follow-ups/` through `project-knowledge`; resolve them through `resolve-follow-ups`.
- Record reusable decisions in `docs/decisions/` and canonical project terms in root `GLOSSARY.md` through `project-knowledge`.
- Before changing a settled project rule, use `docs/decisions/README.md` to load only the relevant decision contracts.

## Development Workflow

- Package manager: `bun`

### Commit Rules
- Commit per logical unit of work; do not mix unrelated changes
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Question Rules
- Use the environment's structured user-input tool for multiple-choice questions when available; otherwise ask one concise question.

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
- `.env.local` contains `DEV_LOGIN_ENABLED=true` — required by `e2e/auth/dev-login.spec.ts`; a dev server started before the flag was added must be restarted
- `bunx playwright install chromium` (once)

### Local AI testing (dev-login)

`GET /auth/dev-login?email=<seeded>[&next=/path]` signs the browser in as an existing local account with one URL visit (no magic-link email round-trip) and redirects to `next` (default `/`). Use it to test any authenticated page locally — from the browser preview, Playwright, or curl.

Seeded accounts (`supabase/seed.sql`, restored by `supabase db reset`):

| Email | display_name | Cohort | Owns project |
|-------|--------------|--------|--------------|
| `alice@example.com` | 지우 | LGE-1 | Paint Studio |
| `bob@example.com` | 하늘 | LGE-2 | Note Keeper |
| `carol@example.com` | 소라 | Inflearn | Focus Timer |
| `operator@example.com` | 두루미 | TOYCRANE (operator) | — |

Preconditions and limits:
- `DEV_LOGIN_ENABLED=true` in `.env.local` (never set in Vercel). The route also 404s on production builds and non-local Supabase URLs.
- Emails must be `@example.com` or `@test.local`, and the user must already exist — unknown emails get 400 (no auto-signup). Test new-user onboarding through the real magic-link flow instead (Mailpit at `:54324`).

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
