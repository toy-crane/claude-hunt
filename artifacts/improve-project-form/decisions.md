# Decisions — improve-project-form

## Reviewer selection: ui-quality-reviewer + design-reviewer + react-reviewer

**When**: Step 2, Reviewer selection
**Decision**: Run `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer`. Skip `wireframe-reviewer`.
**Why**: No `wireframe.html` exists for this feature, so `wireframe-reviewer` has nothing to verify against. The other three apply: UI changes (trigger button, dialog, toast) → `ui-quality-reviewer`; shadcn components (`Dialog`, `Button`, `Sonner Toaster`) → `design-reviewer`; Next.js App Router page + new client component → `react-reviewer`.
**Harness Signal**: N/A — the skill's selection rules already align with what I picked.
**Result**: Success — react-reviewer PASSED with 0 critical; ui-quality-reviewer PASSED with 2 logged warnings; design-reviewer flagged 1 preexisting critical + 2 preexisting minors that fall outside this feature's spec scope (see entries below).

## Task execution order: 1 → 2 → 3 → 4 → 5

**When**: Step 3, Task ordering
**Decision**: Execute in plan-declared order: Task 1 (Sonner infra) → Task 2 (SubmitForm onSuccess refactor) → Task 3 (SubmitDialog) → Task 4 (page integration) → Task 5 (E2E spec update).
**Why**: Tasks 1 and 2 are both dependency-free and can run in either order. Task 3 depends on both. Task 4 depends on Task 3. Task 5 depends on Task 4. The plan-declared order already reflects this dependency graph, so no re-ordering is needed.
**Harness Signal**: N/A — plan.md already encodes the order.
**Result**: Success — all five tasks landed in order, one conventional commit per task, `bun run typecheck` and `bun run test:unit` both green at each checkpoint.

## TS union-typed mock required `vi.mocked()` cast in page.test.tsx

**When**: Step 4, Task 4 verification
**Decision**: Use `vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce(...)` instead of `mockClient.auth.getUser.mockResolvedValueOnce(...)`.
**Why**: `createMockSupabaseClient`'s signature types `getUser` as a union of `Mock<Procedure> | (() => Promise<unknown>)`, so direct access to `.mockResolvedValueOnce` fails typecheck on the non-Mock arm. Wrapping with `vi.mocked(...)` narrows the type cleanly without changing the helper signature.
**Harness Signal**: The shared `createMockSupabaseClient` helper's return type blurs mock vs. plain-function arms; callers that need per-test overrides have to reach for `vi.mocked`. Consider narrowing the helper's return type so each auth method is `Mock<...>` directly — it would save the cast at every call site.
**Result**: Success — typecheck clean, tests green.

## Reviewer finding: `<p role="alert">` errors in SubmitForm (design-reviewer critical) — NOT FIXED

**When**: Step 5, reviewer feedback judgment
**Decision**: Reject the finding as out-of-scope. Do not replace the inline `<p>` error text in `features/submit-project/ui/submit-form.tsx` with `Alert` components in this pass.
**Why**: The flagged code (lines 164–181) is preexisting — it was not authored or changed by this feature. spec.md → Excluded explicitly lists "Changes to field validation, character counters, or screenshot upload UX — out of scope for this pass; the existing submit form's validation stays unchanged." Touching it would violate `incremental-implementation` Rule 0.5 (Scope Discipline). Worth filing as a follow-up; does not block this merge.
**Harness Signal**: Reviewers currently flag preexisting violations with no awareness of the spec's Excluded section. Consider feeding the spec's Excluded list into the reviewer brief so preexisting-scope findings get downgraded from critical to advisory. This would also reduce the Team Lead's judgment burden.
**Result**: Success — left unchanged, follow-up noted.

## Reviewer finding: `data-disabled` / `data-invalid` missing on Field (design-reviewer minor) — NOT FIXED

**When**: Step 5, reviewer feedback judgment
**Decision**: Reject as out-of-scope for the same reason as the Alert finding above.
**Why**: The flagged code is in preexisting `SubmitForm` markup (the `Field` wrappers at lines 113–162). This feature only touched `SubmitForm` to add the `onSuccess` prop and remove the inline success `<p>`. Adding validation-state attributes is an enhancement to existing validation UX — excluded by spec.
**Harness Signal**: Same as the previous entry — reviewers need spec-scope awareness.
**Result**: Success — left unchanged.

## Reviewer finding: `size-4` on icons in `shared/ui/sonner.tsx` (design-reviewer minor) — NOT FIXED

**When**: Step 5, reviewer feedback judgment
**Decision**: Leave the CLI-generated `shared/ui/sonner.tsx` as-is.
**Why**: This file was emitted verbatim by `bunx --bun shadcn@latest add sonner`. Modifying it would put the local file out of sync with the upstream shadcn template. The icon sizing rule (`icons.md`: "No sizing classes on icons inside components") is written for hand-authored components; the shadcn CLI's own templates are the source of truth for shadcn components and currently ship with these classes. If the project wants stricter enforcement, the fix belongs upstream or in a post-generation patch step, not in this feature.
**Harness Signal**: `shadcn-guard.md` should explicitly state whether CLI-generated files under `shared/ui/*` are exempt from the icon-sizing rule, or whether a local override is expected after generation. Today it is ambiguous.
**Result**: Success — left as generated.

## Reviewer finding: cohort-blocked dead-end UX (ui-quality-reviewer warning) — LOGGED, NOT FIXED

**When**: Step 5, reviewer feedback judgment
**Decision**: Accept the warning and leave the behavior as-specified. The dialog opens for signed-in students without a cohort and shows the guidance banner with disabled form fields.
**Why**: This is an explicit decision recorded in plan.md's Architecture Decisions table ("No-cohort behavior: Dialog opens with guidance banner + disabled fields + disabled Submit; reuses the current SubmitForm blocked state; consistent with present UX"). Spec Scenario 3 and Task 3's acceptance bullets both codify this. Changing it here would contradict the approved spec. A future iteration could add an instructor-contact link or hide the trigger for blocked users; both are out of scope now.
**Harness Signal**: N/A — this is the standard "ui-quality warning accepted" path already documented in the execute-plan skill.
**Result**: Success — behavior matches spec.

## Reviewer finding: trigger/button label mismatch "Submit a project" vs. "Submit project" (ui-quality-reviewer warning) — LOGGED, NOT FIXED

**When**: Step 5, reviewer feedback judgment
**Decision**: Accept the warning. Leave the header trigger + DialogTitle as "Submit a project" and the in-form Submit button as "Submit project".
**Why**: The form button's label "Submit project" is preexisting, and the E2E regex `SUBMIT_PROJECT_BTN_RE = /submit project/i` relies on it. Renaming the form button would require coordinating spec-level wording and updating tests; renaming the trigger to match would require changing two newly-added unit-test regexes and one E2E regex. Neither change is load-bearing for the feature, and both risk unnecessary churn. The inconsistency is a cosmetic polish item best addressed in a follow-up pass that also reviews microcopy holistically.
**Harness Signal**: When a feature renames user-facing strings that are referenced by regex in both unit and E2E tests, the cost of consistency is a multi-file ripple. Plans that introduce new UI text could list "canonical phrasing" as an explicit decision up front — today it's resolved ad-hoc per component.
**Result**: Success — inconsistency preserved deliberately.
