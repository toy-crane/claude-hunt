# Claude Hunt

A Next.js app with shadcn/ui, powered by a Claude Code harness for TDD-driven development.

Production: https://www.claude-hunt.com

## Getting Started

```bash
bun install
bun dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server (Turbopack) |
| `bun run build` | Production build |
| `bun run test` | Run all tests |
| `bun run check` | Lint + format check (Ultracite) |
| `bun run fix` | Auto-fix (Ultracite) |

## Adding Components

```bash
npx shadcn@latest add button
```

Components are placed in `components/ui/`. Do not modify `components/ui/*` directly — use variant props, semantic tokens, or CSS variables instead.

## Development Workflow

This project uses a product-context and spec-driven TDD workflow:

1. **Define product** — `/define-product` maintains app-wide direction when it changes
2. **Shape work** — `/shape-idea` settles one work unit and writes its spec
3. **Prototype when needed** — `/build-prototype` makes a complete UI surface reviewable
4. **Split when needed** — `/split-into-tasks` separates independently deliverable outcomes
5. **Implement** — `/implement` completes and verifies the selected spec

## Harness

The `.claude/` directory contains the automation harness:

- **Hooks** — auto-lint on file save, secret detection before commits, test gate on stop, worktree isolation
- **Rules** — shadcn component guard
- **Agents** — specialist reviewers and helpers for code, design, React, security, migrations, testing, and UI quality
- **Skills** — project-local and linked vendor skills for product shaping, implementation, Git operations, and the application stack

### Prerequisites

- [Bun](https://bun.sh)
- [gitleaks](https://github.com/gitleaks/gitleaks) — `brew install gitleaks` (for secret-guard hook)
