## Workflow Phases

Define → Plan → Build → Verify → Review → Ship

## Development Workflow

- Package manager: `bun`
- Tests: `bun run test`

### Commit Rules
- Commit per logical unit of work; do not mix unrelated changes
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Question Rules
- Always use the AskUserQuestion tool for multiple-choice questions

## Architecture

Reverse dependencies are forbidden to prevent circular dependencies. Implement from least to most dependent.

| Order | Directory | Allowed Dependencies |
|-------|---------|-----------|
| 1 | `types/` | None |
| 2 | `config/` | types |
| 3 | `lib/` | types, config |
| 4 | `services/` | types, config, lib |
| 5 | `hooks/` | types, config, lib, services |
| 6 | `components/` | types, config, lib, hooks |
| 7 | `app/` | All |

## Boundary

### Ask-first
- Changes to spec.yaml
- Adding new external dependencies
