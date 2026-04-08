# Claude Hunt

A Next.js app with shadcn/ui, powered by a Claude Code harness for TDD-driven development.

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

This project uses a spec-driven TDD workflow:

1. **Write requirements** — `/write-requirements`
2. **Write spec** — `/write-spec` generates `spec.md` + `spec.yaml`
3. **Sketch wireframe** — `/sketch-wireframe` creates an HTML wireframe
4. **Draft plan** — `/draft-plan` produces a TDD task list
5. **Execute plan** — `/execute-plan` orchestrates Builders and Reviewers

## Harness

The `.claude/` directory contains the automation harness:

- **Hooks** — auto-lint on file save, secret detection before commits, test gate on stop, worktree isolation
- **Rules** — shadcn component guard
- **Agents** — builder, reviewers (design, react, spec, plan, wireframe, UI quality), code simplifier, skill researcher
- **Skills** — 19 skills covering Next.js best practices, React patterns, spec writing, wireframing, and more

### Prerequisites

- [Bun](https://bun.sh)
- [gitleaks](https://github.com/gitleaks/gitleaks) — `brew install gitleaks` (for secret-guard hook)
