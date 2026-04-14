# improve-cohort-filter — Decisions

## Reviewer Selection

**When**: Step 2  
**Decision**: Run `ui-quality-reviewer`, `react-reviewer`, `design-reviewer`. Omit `wireframe-reviewer` (no wireframe.html).  
**Why**: Task 1 introduces a new skeleton UI component and rewires RSC composition in `app/page.tsx`. Three reviewers cover visual quality, React/Next.js patterns, and shadcn design-system compliance.  
**Harness Signal**: N/A  
**Result**: Pending

---

## Task Execution Order: Task 1 before Task 2

**When**: Step 3  
**Decision**: Execute Task 1 (UI / Suspense skeleton) first, then Task 2 (DB trigger + view rewrite).  
**Why**: Task 1 is pure application-layer; it works on top of the current query. Landing it first means the skeleton already masks latency while Task 2's DB migration is applied. The two tasks touch different layers with no shared file dependencies.  
**Harness Signal**: N/A  
**Result**: Pending
