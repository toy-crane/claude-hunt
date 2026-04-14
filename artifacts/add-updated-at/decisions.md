# add-updated-at — Decisions Log

## No Reviewers selected

**When**: Step 2, Reviewer selection
**Decision**: Skip all four standard Reviewers (`wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`).
**Why**: The feature touches only Postgres schemas, migrations, pgTAP tests, and the auto-generated Supabase types file. No wireframe exists (spec has no UI). No React/Next.js code is modified. None of the four listed Reviewers match this surface area. Spec conformance is verified directly by pgTAP (`bun run test:db`) + `bun run typecheck` + `bun run build` at the final checkpoint.
**Harness Signal**: `execute-plan/SKILL.md` Step 2 lists four UI/React Reviewers but is silent on pure-infrastructure features (DB migrations, CI config, etc.). Consider adding explicit guidance: "If none of the listed Reviewers match, state that explicitly in decisions.md and rely on the plan's Verification steps as the evaluation signal." Alternatively, document a `code-reviewer` or `security-auditor` escalation path for non-UI changes.
**Result**: Pending

## Sequential Task order 1 → 2 → 3 → 4 → 5

**When**: Step 3, Task ordering
**Decision**: Execute Tasks in the exact order listed in plan.md.
**Why**: Tasks 1–4 are mutually independent (different tables, no shared files beyond the global migrations directory which is timestamp-ordered). Task 5 depends on Tasks 3 & 4 because `gen:types` needs the new columns applied. The plan already places simplest-first (trigger-only) before more-involved (column + trigger), which also acts as a warm-up for the pgTAP assertions. No parallelization benefit inside a single-agent Team Lead loop.
**Harness Signal**: N/A
**Result**: Pending
