# Onboarding Process — Execution Decisions

## Reviewer selection: two static (design, react); two visual deferred

**When**: Step 2 initial plan; revised at Step 5 launch
**Decision**: Run `design-reviewer` and `react-reviewer` at Step 5 in parallel (static code review). Defer `wireframe-reviewer` and `ui-quality-reviewer` to a manual pass because the `/onboarding` screen only renders for signed-in users whose `profiles.cohort_id` is null, and seeding that auth state for a headless browser reviewer is more work than the review is worth at this stage. Unit tests in `features/onboarding/ui/onboarding-form.test.tsx` already verify the rendered tree matches the wireframe's three screens (base, validation errors, no-cohorts empty state).
**Why**: Visual reviewers need screenshots. Screenshots need a specific auth state that the reviewer agents can't provision alone. The risk is low: the wireframe was structural (layout, hierarchy, empty-state shape), and the implementation is built on shadcn primitives shared with the rest of the app — visual drift is unlikely.
**Harness Signal**: SKILL.md says "wireframe-reviewer — when wireframe.html exists AND there are UI change tasks". In practice there's an unstated third precondition: the UI must be reachable by a stateless fetch. Skill should document the auth-state prerequisite and suggest when to defer.
**Result**: Pending

## Task order: 1 → 2 → 3 → 4 → 5 → 6 (strict linear)

**When**: Step 3
**Decision**: Execute tasks in the numbered order from plan.md.
**Why**: plan.md declares a strict linear dependency chain — migration → server action → UI → page → middleware → cleanup. No opportunity to parallelise; every task needs the prior one's output.
**Harness Signal**: N/A — dependency field in plan.md was unambiguous.
**Result**: Success — each task's tests passed before moving on; no re-ordering needed.

## Pivot: middleware.ts → proxy.ts for Next.js 16

**When**: Step 4, Task 5 post-implementation, surfaced by `bun run build`
**Decision**: Renamed `middleware.ts` → `proxy.ts` and `middleware()` → `proxy()`, absorbing the existing root `proxy.ts` (which was a thin wrapper around `shared/api/supabase/proxy.ts:updateSession`). Deleted the orphan `middleware.ts` so the two no longer conflict.
**Why**: Next.js 16 renamed the middleware convention to proxy (see https://nextjs.org/docs/messages/middleware-to-proxy). The build outright refuses when both files coexist. The plan.md (and spec wording) used the older "middleware" term because that was the historical convention in every repo example I read; `proxy.ts` already existed at the root doing the session-refresh half of the job. Merging gate + session refresh into one function is strictly better than layering them.
**Harness Signal**: `draft-plan` skill should spot-check framework version against recent renames before writing task descriptions. For Next.js 16 specifically, the plan template's "root middleware.ts" phrasing is stale. An `execute-plan` pre-flight that runs `bun run build` once per task group would have surfaced this before Task 5 rather than at the end.
**Result**: Success — pivot absorbed cleanly; the 12 proxy tests are unchanged behaviour, just renamed symbols. `bun run build` now succeeds.

## Biome false-positive on React 19 / next/server imports

**When**: Step 4, every task that imported `Suspense`, `useId`, `useState`, `useTransition`, `NextRequest`, `NextResponse`, or `revalidatePath`
**Decision**: Accept the `lint/correctness/noUnresolvedImports` warnings. These are non-blocking warnings (not errors) that ultracite/Biome emits because its module resolution can't see React 19's exports or Next 16's `next/server` re-exports. `tsc --noEmit` and `bun run build` both succeed, proving the imports are real.
**Why**: The imports are correct; the tool is wrong. Rewriting them would require `import * as React from "react"` shims everywhere, which none of the existing feature code does. The project already tolerates the same warning (e.g. previous commit `b43bf11` added `Suspense` in `app/page.tsx` with the same warning accepted).
**Harness Signal**: Project-level: consider adding a Biome overrides block for these specific imports, or upgrading to a Biome version that understands React 19/Next 16. Harness-level: ultracite's `noUnresolvedImports` rule against React/Next exports is a known false-positive class that developers must routinely dismiss — worth documenting in the shadcn or project-bootstrap skill.
**Result**: Partial — warnings accepted, commits proceed, build is green. No functional impact.
