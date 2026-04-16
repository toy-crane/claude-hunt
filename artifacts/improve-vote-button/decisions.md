# improve-vote-button — Decisions Log

## Reviewer selection

**When**: Step 2
**Decision**: Run all four applicable reviewers at Step 5 — `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`.
**Why**: wireframe.html exists and the change is UI-only on a React client component that uses shadcn primitives. All four agent specs are applicable; omitting any would narrow coverage without saving real time since they run in parallel.
**Harness Signal**: N/A (the reviewer selection rules in SKILL.md already covered this case unambiguously).
**Result**: Success — All four reviewers closed out: wireframe-reviewer PASS, design-reviewer PASS, react-reviewer PASS (3 advisories), ui-quality-reviewer initially FAIL then PASS on re-review after contrast fix.

## Task execution order

**When**: Step 3
**Decision**: Execute Tasks 1 → 2 → 3 → 4 → 5 in the order defined by the plan.
**Why**: Task 1 provides the `--vote` token that Tasks 2–4 consume. Tasks 2, 3, 4 all modify the same `vote-button.tsx` + its test file, so they are inherently sequential. Task 5 depends on the slot content from Tasks 2–4 rendering correctly in all three viewer contexts before the surrounding layout moves.
**Harness Signal**: N/A — the plan's stated dependencies matched actual file-level ordering constraints.
**Result**: Success — all five tasks landed in the planned order, each with its own commit, full test suite green (301/301), and build clean after every task.

## Plain `<button>` instead of shadcn Button for the vote pill

**When**: Step 4, Task 2
**Decision**: Render the pill as a plain `<button>` element rather than wrapping the shadcn `Button` component.
**Why**: The shadcn Button is built for horizontal `row`-direction content with fixed `h-7/h-8/h-9` heights per size variant. A vertical pill (chevron stacked above count) requires `flex-col` + `h-auto`, which would force className overrides that conflict with the variant system — explicitly prohibited by `shadcn-guard.md` ("Do not override the default component styles with className"). Modifying `shared/ui/button.tsx` to add a "vote" variant is also prohibited by the same rule. A plain `<button>` with semantic tokens keeps the design-system intent intact and was endorsed (Advisory, not blocking) by the design-reviewer pass.
**Harness Signal**: The shadcn-guard rule set doesn't currently articulate when to skip shadcn Button in favor of a plain element. Consider adding a "when to escape the variant system" note: if the target shape is orthogonal to the Button's dimensional model (direction, height), a plain element is preferable to a className fight.
**Result**: Success — design-reviewer flagged only an Advisory (consider a Button variant long-term), no fail-tier violations.

## Lifted vote contrast from oklch(0.7) to oklch(0.58) after UI review

**When**: Step 5, ui-quality-reviewer fail
**Decision**: Darken the light-mode `--vote` token from `oklch(0.7 0.14 42)` to `oklch(0.58 0.14 42)` after the ui-quality-reviewer measured only 2.69:1 contrast at 0.7 (below WCAG AA's 4.5:1 for normal text and 3:1 for UI components).
**Why**: Accessibility is non-negotiable. The approved visual character (warm coral) was preserved at the darker luminance — it's still the same hue, just rendered with more saturation headroom. Re-review measured 4.53:1 at 0.58 (narrow AA pass on idle text, AA pass on voted fill).
**Harness Signal**: The wireframe-review and color-picking phases operated in a tool that did not surface contrast ratios. Adding a contrast check to the `sketch-wireframe` skill (e.g. a 'check each candidate against the two surfaces it will touch' rule) would catch this before the fix-on-review cycle.
**Result**: Success — ui-quality-reviewer returned PASS on the second run.

## Accepted focus-ring color-distinctiveness warning

**When**: Step 5, ui-quality-reviewer re-review
**Decision**: Accept the Warning that the coral focus ring is visually close to the idle coral border (1.61:1 color contrast between ring and border) because the 2px background-colored offset gap provides structural separation and no fail-tier rule is violated.
**Why**: Per Step 5 of the execute-plan skill, a `ui-quality-reviewer` Warning is logged without re-review. Swapping the ring color to the neutral `--ring` token would sacrifice theme coherence on focus; the current offset-based separation is adequate for keyboard users.
**Harness Signal**: N/A — the skill's Warning-handling rule handled this correctly.
**Result**: Success — logged here, no code change.

## React-reviewer advisories: deferred

**When**: Step 5, react-reviewer pass
**Decision**: Addressed the a11y advisory (owner-div screen-reader label) immediately; deferred the stale-closure refactor and `useOptimistic` migration.
**Why**: The a11y note was a real defect — screen readers announce the bare number without context. The stale-closure concern is moot in practice because `disabled={isPending}` blocks a double-fire before the closure could re-execute, and migrating to `useOptimistic` is a net-positive refactor that doesn't belong in a UI-polish PR.
**Harness Signal**: N/A — advisory-vs-fail tiering worked as intended.
**Result**: Success — a11y fix shipped in commit 60cbbe7.
