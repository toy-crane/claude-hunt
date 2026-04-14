# improve-cohort-filter — Decisions

## Reviewer Selection

**When**: Step 2  
**Decision**: Run `ui-quality-reviewer`, `react-reviewer`, `design-reviewer`. Omit `wireframe-reviewer` (no wireframe.html).  
**Why**: Task 1 introduces a new skeleton UI component and rewires RSC composition in `app/page.tsx`. Three reviewers cover visual quality, React/Next.js patterns, and shadcn design-system compliance.  
**Harness Signal**: Three-reviewer combination was appropriate. All passed. The ui-quality-reviewer produced the most actionable findings (action-strip layout-shift warning), which directly improved the implementation. The react-reviewer caught the sequential await; the design-reviewer caught the redundant style override. Running all three in parallel on a UI + RSC + DB feature was correct.  
**Result**: Success

---

## Task Execution Order: Task 1 before Task 2

**When**: Step 3  
**Decision**: Execute Task 1 (UI / Suspense skeleton) first, then Task 2 (DB trigger + view rewrite).  
**Why**: Task 1 is pure application-layer; it works on top of the current query. Landing it first means the skeleton already masks latency while Task 2's DB migration is applied. The two tasks touch different layers with no shared file dependencies.  
**Harness Signal**: Order was correct. Task 1 required no DB changes and committed cleanly. Task 2 depended on no Task 1 artifacts. Sequential execution with independent commits made each revertable without affecting the other.  
**Result**: Success

---

## Security Test Correction: RLS empty-result vs. 42501 privilege error

**When**: Task 2, pgTAP test authoring  
**Decision**: Changed `throws_ok(..., '42501', ...)` to `is_empty(...)` for the anon-on-profiles assertion in `projects_with_vote_count_security_test.sql`.  
**Why**: `profiles` has RLS enabled with no `anon` SELECT policy. Supabase's default grants give `anon` SELECT privilege at the table level, so no `42501` is raised — RLS silently returns 0 rows. The correct assertion is that anon gets no rows, not a permission error.  
**Harness Signal**: Test authoring assumption "no anon policy → 42501" was wrong for RLS-based filtering. For future security tests: distinguish between privilege-level denial (GRANT absent → 42501) and RLS-level filtering (GRANT present, policy absent → empty result). The test correctly documents the actual security boundary once corrected.  
**Result**: Success (1 test failure caught and fixed before commit)
