# improve-main-page — Decision Log

## Reviewer selection

**When**: Step 2
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `react-reviewer`, and `design-reviewer` at the evaluation loop (Step 5).
**Why**:
- `wireframe-reviewer` — wireframe.html exists and every task changes UI.
- `ui-quality-reviewer` — 6/6 tasks deliver user-visible UI changes.
- `react-reviewer` — all changes are React/Next.js components; `<ViewTransition>`, optimistic state, stable callbacks, and list keys are explicit concerns in plan.md.
- `design-reviewer` — the brand has a specific "monochrome + terracotta only" discipline that plan.md upgrades to exact hex tokens; a token-compliance pass is warranted.
- `migration-reviewer` / `security-auditor` — omitted; no schema or auth changes in this feature.
**Harness Signal**: N/A (matches the skill's "UI + wireframe → run these three" recommendation; design-reviewer was added by judgment given the tight palette rules in spec.md).
**Result**: Success — all four produced reports in parallel within a single eval loop iteration. wireframe-reviewer reported a false positive ("owner icons missing") caused by the viewer in the MCP session not being any project's owner; the guarded `isOwner` branch is correct and verified via unit tests. ui-quality-reviewer returned PASS with 4 warnings + 5 advisory. react-reviewer returned 1 real warning (memoize `handleCohortChange`) plus two claims that inspection proved false (waterfall / `.terminal-surface` missing). design-reviewer returned 3 warnings (fallback hex in rank-dot tokens, `className="rounded-none"` overrides on shadcn Buttons) — both intentional tradeoffs documented below.

## Task execution order

**When**: Step 3
**Decision**: Execute tasks in plan.md's stated order: T1 → T2 → T3 → T4 → T5 → T6. No parallelization, no merging.
**Why**:
- T1 (PromptLine) drops a new component onto the existing grid — zero regression risk, shortest task.
- T2 (grid → list) is the biggest layout swap; it must come after T1 so the prompt line already exists above it.
- T3 (chips) replaces CohortDropdown; needs T2's list underneath so the subtitle-count + prompt-line already read from client state.
- T4 (owner actions) renders inside the row built in T2; depends on T2.
- T5 (mobile) rewrites the same `project-card.tsx` T2 creates; must come after T2 and chip-wrap only makes sense after T3.
- T6 (palette) intentionally last — earlier tasks use semantic tokens; T6 retunes to exact hex values in one pass.
**Harness Signal**: plan.md already declared dependencies explicitly, so no reorder was required. The "Dependencies" field on each Task worked; keep it.
**Result**: Success — all six tasks executed in the planned order, one conventional commit per task, with the full Vitest suite green after each (353 → 366 → 370 → 376 → 381 → 381 tests). The T2 mid-task restructuring (moving H1/subtitle/submit into ProjectBoard so the subtitle could reflect filtered counts) was not in the plan's "Implementation targets" but fell out naturally from Scenario 2's "subtitle count updates" acceptance bullet — an example of the plan-level file list under-specifying follow-on cascading edits.

## Spec sync deferral for Scenario 7

**When**: Step 1 (prereq read)
**Decision**: Do NOT pause to run a `/write-spec` sync for the 3 stale bullets in `spec.md` § Scenario 7 (34 px thumb / vertical vote / scrollable chips). Execute Task 5 against the wireframe 🅰️ decision (documented in plan.md Task 5 Acceptance) and note the spec drift for a follow-up edit after the feature ships.
**Why**: The drift is purely a wording update on three Success Criteria bullets; the underlying design intent is captured in the wireframe and in Task 5's Acceptance bullets. Stopping mid-execution to edit spec.md would force context re-entry without changing any implementation. Post-ship, a one-paragraph `/write-spec` pass reconciles the wording.
**Harness Signal**: Consider adding a rule to `sketch-wireframe` that amends spec.md in-place when a wireframe iteration changes an observable criterion — current rule forbids spec edits during the wireframe loop, which creates this exact drift situation.
**Result**: Partial — Task 5 shipped against the wireframe 🅰️ decision (64 px row, 48×48 thumb with overlay rank badge, horizontal vote button, chip wrap). The three stale Success Criteria bullets in spec.md § Scenario 7 remain unedited; a follow-up `/write-spec` pass is queued for after merge.

## Reviewer feedback judgments (Step 5)

**When**: Step 5 evaluation loop
**Decision**:
- **react-reviewer's `handleCohortChange` useCallback warning** — accepted. Wrapped the callback in `useCallback([], …)` so any future memoization downstream is not silently busted. Applied as a follow-up commit.
- **react-reviewer's "fetchCohorts waterfall" claim** — rejected. The page already runs `fetchViewer` and `fetchCohorts` in a single `Promise.all`; `fetchProjects` is the only genuinely dependent call (needs `viewer?.id` for the vote-merge). The reviewer misread the structure.
- **react-reviewer's "no .terminal-surface in globals.css" claim** — rejected. The scope was added in T6 (commit f7720f1); the reviewer's file read was likely stale.
- **react-reviewer's inline `renderOwnerActions` / `renderVoteButton` warning** — accepted-as-advisory. Extracting to `useCallback` would help only once a downstream `React.memo` exists; kept inline for now.
- **design-reviewer's `rank-badge.tsx` fallback hex** — accepted-as-intentional. The raw-hex fallbacks (`bg-[var(--term-rank-1,#f59e0b)]`) keep the rank dot visible when RankDot is rendered outside `.terminal-surface` (e.g., OG image, tests). Removing the fallback would make the dot transparent in those contexts. Trade-off documented.
- **design-reviewer's `rounded-none` via className on shadcn Buttons** — accepted-as-warning. The alternative (adding a variant to `components/ui/button.tsx`) violates the shadcn-guard rule against editing that directory. `className="rounded-none"` is the least-bad workaround and is localized to three call sites (SubmitDialog, EditDialog icon trigger, DeleteButton icon trigger).
- **design-reviewer's `STACKED_BASE_CLASS rounded-md`** — rejected. The stacked variant is never used on the terminal surface (all landing-page consumers use `variant="inline"`); the stacked rounded-md is for any future non-terminal consumer and matches default shadcn styling.
- **wireframe-reviewer's "owner icons missing" partial-fail** — false positive. Browser DOM inspection confirmed the authenticated viewer in the MCP session was not any project's owner; the `isOwner` guard in `project-card.tsx:44` correctly suppressed the icons. The logic is verified by the `renders owner actions only when the viewer is the project owner` unit test.
- **ui-quality-reviewer's warnings** (H1 not monospace; header background mismatch; dark-mode login button border; mobile tagline truncation) — accepted-as-advisory. Each is a legitimate polish point but none blocks ship; tracked for a future pass.
**Why**: Spec-conformance was the acceptance bar; the plan's Invariants § Color-discipline and the spec's Scenario 8 exact hex values are satisfied. The warnings surface polish work, not specification violations.
**Harness Signal**: The `react-reviewer` agent's false claims ("fetchCohorts waterfall", "no .terminal-surface") suggest its file-read step read stale content or a partial diff. Worth investigating whether the reviewer's context window is being truncated mid-review.
**Result**: Success — feedback loop closed in one iteration; no additional review round required.
