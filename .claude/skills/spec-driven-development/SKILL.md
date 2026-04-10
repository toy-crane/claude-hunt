---
name: spec-driven-development
description: Creates specs before coding. Use when starting a new project, feature, or significant change and no specification exists yet. Use when requirements are unclear, ambiguous, or only exist as a vague idea.
---

# Spec-Driven Development

## When to Use

- Starting a new project or feature
- Requirements are ambiguous or incomplete
- The change touches multiple files or modules
- You're about to make an architectural decision
- The task would take more than 30 minutes to implement

**When NOT to use:** Single-line fixes, typo corrections, or changes where requirements are unambiguous and self-contained.

## Workflow

```
SPECIFY ──→ PLAN ──→ BUILD ──→ VERIFY ──→ REVIEW ──→ SHIP
```

Each phase has a human review gate. Do not advance until the current phase is validated.

| Phase | Skill / Command |
|-------|----------------|
| Specify | `/spec` skill |
| Plan | `/plan` command |
| Build | `/build` command |
| Verify | `/test` command |
| Review | `/review` command |
| Ship | `/ship` command |
