## Development Workflow

- Package manager: `bun`
- Tests: `bun run test`

### Immutable Contract
- `artifacts/spec.yaml` is the single immutable contract for the entire app
- If the implementation does not match spec.yaml, fix the implementation
- When a new feature completely replaces an existing one, delete the old feature, but never reuse deleted scenario IDs

### TDD
1. Generate spec tests (*.spec.test.tsx) based on spec.yaml (Red)
2. Write unit tests (*.test.tsx) for pure logic (Red)
3. Implement the minimum code to pass the tests (Green)
4. Refactor while keeping both sets of tests passing

### Test File Conventions

| File Pattern | Location | Purpose |
|---|---|---|
| `{feature-id}.spec.test.tsx` | `__tests__/` | Acceptance criteria tests per spec.yaml feature |
| `*.test.tsx` | Next to component/module | Implementation unit tests |
| `helpers.tsx` | `__tests__/` | Shared test helpers (renderWithContent, etc.) |

- Spec tests are split into files per spec.yaml feature
- Do not duplicate spec scenarios in unit tests

### Spec Test Rules
- Spec tests (`*.spec.test.tsx`) are acceptance criteria that verify the spec.yaml contract
- When a scenario's behavior changes, update all tests that reference that ID

### Commit Rules
- Commit per logical unit of work; do not mix unrelated changes
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Question Rules
- Always use the AskUserQuestion tool for multiple-choice questions

### Task Rules
- Every task must include Acceptance Criteria:
  1. Define specific tests/commands to verify the implementation
  2. Specify concrete inputs and expected outputs
  3. Run and pass all acceptance criteria after implementation

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
