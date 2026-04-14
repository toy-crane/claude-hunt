# fit-login-onboarding — Execution Decisions

## Reviewer selection: all four UI reviewers

**When**: Step 2
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer` in parallel at the end of the evaluation loop.
**Why**: `artifacts/fit-login-onboarding/wireframe.html` exists → wireframe-reviewer applies. All three tasks with code changes (Tasks 1–3) ship UI → ui-quality + design apply. The code is React/Next.js client components → react-reviewer applies. No backend, no security surface, no perf critical path → no security/perf reviewers needed.
**Harness Signal**: Simple branching: UI features with wireframe + React + design-system rules always run the full UI reviewer quartet. This could be a skill default when plan.md's Affected Files list is majority `.tsx`.
**Result**: Pending

## Task execution order: 1 → 2 → 3 → 4, sequential

**When**: Step 3
**Decision**: Execute Task 1 first (AuthLayout + test), then Task 2 (login adopt), then Task 3 (onboarding adopt), then Task 4 (create-logo spec doc update).
**Why**: Tasks 2 and 3 both depend on Task 1 (AuthLayout must exist before adoption). Task 2 and Task 3 are independent of each other but are executed sequentially by the single Team Lead to keep the commit history linear and reviewable. Task 4 depends on Tasks 1–3 because the supersession of the create-logo invariant is only accurate once the new behavior ships.
**Harness Signal**: Plan.md already declares Task 2 ⊥ Task 3 (both depend only on Task 1). Sequential Team-Lead execution is fine here because each task is S-size, but for larger plans a teammate split (TeamCreate) could shorten wall-clock time. The plan could explicitly flag "parallelizable after Task N" for future harness to act on.
**Result**: Pending

## Rejected design-reviewer feedback (4 pre-existing findings)

**When**: Step 5, design-reviewer returned `Partial` with 4 FAIL items.
**Decision**: Reject all 4 fixes as out of scope for this feature. Record them as follow-ups for a future theme/forms-cleanup feature.
**Why**: Every flagged item is code that already existed before this feature and was preserved on purpose, not introduced by the refactor:

1. `shared/ui/auth-layout.tsx:22` — `bg-zinc-50 dark:bg-transparent` — I *moved* this class string from the inline `<section>` on each of `login-form.tsx` and `onboarding-form.tsx` into `AuthLayout` unchanged. The spec's Excluded list explicitly forbids theme/color changes in this feature: "Theme or color changes — light/dark palette and component styling remain as today." The plan's Task 1 acceptance bullet `The outer section element carries the classes … bg-zinc-50 … dark:bg-transparent` requires token stability — changing these here would fail my own spec.
2. `features/auth-login/ui/login-form.tsx:64,72` — `<GitHubIcon className="size-4" />` / `<GoogleIcon className="size-4" />` — present in this file before the refactor (`login-form.tsx:68-69` of the prior commit). Spec's Excluded list: "Form contents … unification is layout-level only."
3. `features/auth-login/ui/login-form.tsx:87,104` — `className="space-y-4"` on the OTP-sent block and the email field group — both pre-existing. Same Excluded-list reason.
4. `features/auth-login/ui/login-form.tsx:105-106` — raw `<div className="space-y-2">` wrapping `<Label>` + `<Input>` instead of `<FieldGroup>` + `<Field>` — pre-existing markup. Same Excluded-list reason.

The `incremental-implementation` skill's Rule 0.5 reinforces this: "Touch only what the task requires. Do NOT: 'Clean up' code adjacent to your change." Bundling these fixes would expand the diff, make the review harder, and violate the declared feature scope.
**Harness Signal**: `design-reviewer` currently flags pre-existing violations with the same severity as newly-introduced ones. It cannot distinguish "this code was touched by the current change" from "this code happens to live in a file that was touched." Two possible harness improvements: (a) have `design-reviewer` take a base-ref and score only lines changed in the diff, or (b) have the Team Lead's prompt explicitly pass the diff scope so the reviewer biases toward new code. Until then, Team Lead must verify each finding against git history.
**Result**: Pending — will stay Pending; follow-up issue tracked in final report.

**Follow-ups for a future feature** (not part of fit-login-onboarding):
- Replace `bg-zinc-50 dark:bg-transparent` with a semantic token (either `bg-muted` or a new CSS variable in `app/globals.css`) across the auth shell
- Refactor login-form to use `<FieldGroup>` + `<Field>` for the email field (onboarding-form already does)
- Remove `size-4` from OAuth icon children and use shadcn's `data-icon="inline-start"` convention
- Replace `space-y-*` utilities with `flex flex-col gap-*`

## ui-quality-reviewer: 2 warnings logged (no re-review per protocol)

**When**: Step 5, ui-quality-reviewer returned `Pass (with Warnings)`.
**Decision**: Log both warnings without re-review. Per the execute-plan skill: "For `ui-quality-reviewer` only: Warning → log in decisions.md without re-review."
**Why**: Both warnings describe pre-existing behavior that is not introduced or made worse by this feature, and is covered by the spec's Excluded list ("Theme or color changes — light/dark palette and component styling remain as today").

1. **Desktop empty-space dead zone below the form** — an inherent consequence of `flex items-center min-h-screen` on tall viewports when the content block is short. This is the pre-existing shell on both `/login` and `/onboarding`; unification preserved it verbatim. Changing the vertical alignment rule to `items-start pt-[20vh]` would change both screens' shell, which is out of scope for this feature (the spec's Scope.Included says "Both screens share the same page shell"; it does not specify *how* the shell is anchored).
2. **Dark-mode "Continue" button contrast** — governed by `shared/ui/button.tsx` and the global theme tokens; shadcn primary variant in dark mode uses a muted fill by default. Pre-existing across the app, not caused by `AuthLayout`. Proper fix is a theme-layer change (e.g., `dark:bg-white dark:text-black` for the primary button variant), which belongs in a dedicated theme-refinement feature.

**Harness Signal**: Same issue as the design-reviewer feedback — ui-quality-reviewer flags pre-existing rendering issues with the same weight as regressions. When the flagged issue is in a file/area that existed before the current change, the Team Lead needs explicit git-history evidence to reject, which is time-consuming. A diff-scoped version of the reviewer (or a "compare against base-ref" mode) would let the harness distinguish "this shipped broken already" from "this change broke it."
**Result**: Pending — resolved below.

## All Pending results finalized

- **Reviewer selection (Step 2)**: **Success** — all four reviewers ran to completion; coverage was correct (wireframe conformance, visual quality, design-system, React patterns). No reviewer needed to be added or dropped mid-run.
- **Task order (Step 3)**: **Success** — 1 → 2 → 3 → 4 executed without rework. Task 1 unblocked 2 and 3 as expected; Task 4's documentation update landed cleanly after the code change.
- **Rejected design-reviewer feedback**: **Success** — all four items confirmed pre-existing via `git log -p`; declined fixes recorded as follow-ups. Rejection was consistent with spec's Excluded list and incremental-implementation Rule 0.5.
- **ui-quality-reviewer warnings**: **Success** — both warnings confirmed pre-existing via the pre-refactor screenshots of `/login` (same shell classes, same Button variant). No action required for this feature.

## Harness Signal Summary (for future harness tuning)

1. **Plan parallelism hint.** Plan.md already encodes Task 2 ⊥ Task 3 in the Dependencies field, but execute-plan still drives them sequentially. A first-class "parallelizable groups" field would let execute-plan auto-spawn teammates via TeamCreate.
2. **Diff-scoped reviewers.** Both design-reviewer and ui-quality-reviewer raised multiple findings that turned out to be pre-existing in the touched files. A `--base-ref` mode that scores only diff-touched lines (or a prompt-level instruction to bias toward new code) would cut Team Lead verification time significantly.
3. **Auth-gated UI reviews.** ui-quality-reviewer could not screenshot `/onboarding` because the route's redirect gate sent it to `/login`. A convention for passing a signed-in session (cookie, MSW mock, or a storybook-style fixture) would let visual reviewers see authenticated surfaces without auth changes bleeding into feature scope.
