# Nickname Policy Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Source of truth for the validation rule | A single Zod schema in `entities/profile/` | The rule validates a profile field; per FSD, profile schema belongs in the profile entity. Also fixes the existing slice-isolation violation in `features/settings/api/schema.ts` (which currently imports from `features/onboarding`). |
| Unified policy error message | `"닉네임은 2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요."` (exported constant) | Decided in spec discussion. Single message for any non-empty policy violation (length, character set, jamo, whitespace, special character). |
| Empty input message | `"닉네임을 입력해 주세요."` (unchanged) | Spec preserves existing message for empty/whitespace-only input — separate from the policy message. |
| Duplicate message | `"이미 사용 중인 닉네임이에요."` (unchanged, lives in `shared/lib/display-name-violation.ts`) | Spec preserves existing duplicate message. DB-level uniqueness behaviour does not change. |
| Form-level validation | Both forms call the shared schema before the server action (same pattern in onboarding and settings) | Single source of truth; eliminates inline length checks currently duplicated in `onboarding-form.tsx` and the lack of any client-side check in `settings-form.tsx`. |
| DB CHECK constraint on `display_name` | Not added | Existing pattern in `supabase/schemas/profiles.sql` enforces only RLS + uniqueness. Server-action validation (Zod) already gives the spec's defense-in-depth invariant. Adding a CHECK would also block valid maintenance paths (admin-side fixes to legacy data). |

## Infrastructure Resources

None.

## Data Model

### Profile (relevant subset)
- `display_name` (text, nullable) — must match `/^[가-힣a-zA-Z0-9_]{2,12}$/` on insert/update through the application layer (Zod). No DB constraint change.
- Existing case-insensitive, trim-aware uniqueness index `profiles_display_name_ci_unique` — unchanged.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | All tasks | Each Success Criteria → one failing test (RED) → minimal code (GREEN). |
| incremental-implementation | Tasks 1 → 2 → 3 | Land the schema first (foundation), then apply per feature slice. Each task leaves the system passing. |
| fsd | Task 1 | Schema relocation to `entities/profile/` and slice-isolation fix (settings stops importing from onboarding). |
| frontend-ui-engineering | Tasks 2, 3 | Inline validation UX (error rendering under field, value preserved on error, aria-invalid). |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `entities/profile/model/display-name-schema.ts` | New | 1 |
| `entities/profile/model/display-name-schema.test.ts` | New | 1 |
| `entities/profile/index.ts` | Modify | 1 |
| `features/onboarding/api/schema.ts` | Modify | 2 |
| `features/onboarding/api/schema.test.ts` | Modify | 2 |
| `features/onboarding/ui/onboarding-form.tsx` | Modify | 2 |
| `features/onboarding/ui/onboarding-form.test.tsx` | Modify | 2 |
| `features/onboarding/api/actions.test.ts` | Modify | 2 |
| `features/settings/api/schema.ts` | Modify | 3 |
| `features/settings/api/actions.test.ts` | Modify | 3 |
| `features/settings/ui/settings-form.tsx` | Modify | 3 |
| `features/settings/ui/settings-form.test.tsx` | Modify | 3 |

E2E specs in `e2e/*.spec.ts` use values like `"E2E Reviewer"` (space-containing) but write them through direct `supabase.from('profiles').update(...)` — they bypass the form/action validation path, so no E2E change is required.

## Tasks

### Task 1: Define the shared nickname validation schema in `entities/profile` ✅

- **Covers**: Scenario 1 (full at the schema layer), Scenario 2 (full at the schema layer)
- **Size**: S (3 files)
- **Dependencies**: None
- **Note on slicing**: Task 1 is a foundational module without a user-visible change on its own. It is kept separate (not merged into Task 2) because Tasks 2 and 3 both depend on the same shared module — merging Task 1 into Task 2 would push the combined task to 8 files, exceeding the M (5 files) sizing limit. The schema is fully test-covered in isolation here, so the foundation is provable even though the user-visible effect lands in Tasks 2 and 3.
- **References**:
  - test-driven-development — RED first, then GREEN, one assertion per Success Criteria
  - fsd — `entities/<slice>/model/` for domain rules, public API via `index.ts`
- **Implementation targets**:
  - New `entities/profile/model/display-name-schema.ts` exporting:
    - `DISPLAY_NAME_POLICY_MESSAGE` (constant: `"닉네임은 2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요."`)
    - `DISPLAY_NAME_REQUIRED_MESSAGE` (constant: `"닉네임을 입력해 주세요."`)
    - `displayNameSchema` (Zod) — `z.string().trim().min(1, REQUIRED).regex(/^[가-힣a-zA-Z0-9_]{2,12}$/, POLICY)`
  - New `entities/profile/model/display-name-schema.test.ts` — vitest cases below
  - Modify `entities/profile/index.ts` — barrel export the schema and the two message constants
- **Acceptance**:
  - [ ] `displayNameSchema.safeParse("Alice_99")` succeeds; `data` is `"Alice_99"`
  - [ ] `displayNameSchema.safeParse("토이크레인")` succeeds
  - [ ] `displayNameSchema.safeParse("Hi")` succeeds (2 chars, minimum boundary)
  - [ ] `displayNameSchema.safeParse("abcdefghijkl")` succeeds (12 chars, maximum boundary)
  - [ ] `displayNameSchema.safeParse("Car_crash")` succeeds (mixed case + underscore)
  - [ ] `displayNameSchema.safeParse("  Alice  ")` succeeds; `data` equals `"Alice"` (trimmed)
  - [ ] `displayNameSchema.safeParse("")` fails with message `DISPLAY_NAME_REQUIRED_MESSAGE`
  - [ ] `displayNameSchema.safeParse("   ")` fails with message `DISPLAY_NAME_REQUIRED_MESSAGE`
  - [ ] `displayNameSchema.safeParse("a")` fails with message `DISPLAY_NAME_POLICY_MESSAGE`
  - [ ] `displayNameSchema.safeParse("abcdefghijklm")` fails with message `DISPLAY_NAME_POLICY_MESSAGE`
  - [ ] `displayNameSchema.safeParse("Alice!")` fails with message `DISPLAY_NAME_POLICY_MESSAGE`
  - [ ] `displayNameSchema.safeParse("Alice K")` fails (inner whitespace) with message `DISPLAY_NAME_POLICY_MESSAGE`
  - [ ] `displayNameSchema.safeParse("ㄱㄴ")` fails (standalone jamo) with message `DISPLAY_NAME_POLICY_MESSAGE`
  - [ ] `displayNameSchema.safeParse("Alice@example")` fails with message `DISPLAY_NAME_POLICY_MESSAGE`
  - [ ] The barrel `@entities/profile` re-exports `displayNameSchema`, `DISPLAY_NAME_POLICY_MESSAGE`, and `DISPLAY_NAME_REQUIRED_MESSAGE`
- **Verification**:
  - `bun run test:unit -- entities/profile/model/display-name-schema`
  - `bun run typecheck`

---

### Task 2: Apply the new policy to the onboarding flow ✅

- **Covers**: Scenario 1 (full at onboarding), Scenario 2 (full at onboarding), Scenario 3 (partial — onboarding duplicate path), Invariant "Server-side enforcement" (onboarding action), Invariant "Write-only enforcement" (onboarding writes through schema; reads of existing profile data are not gated), Invariant "Single unified violation message" (onboarding form)
- **Size**: M (5 files)
- **Dependencies**: Task 1 (schema must exist and be exported via `@entities/profile`)
- **References**:
  - test-driven-development — update each affected test first, watch it fail, then change the implementation
  - frontend-ui-engineering — error rendering under field via existing `<Field>` / `<Input>` shadcn components; preserve aria-invalid; preserve input value on error
- **Implementation targets**:
  - Modify `features/onboarding/api/schema.ts`:
    - Import `displayNameSchema` from `@entities/profile`
    - Rebuild `onboardingInputSchema` as `z.object({ displayName: displayNameSchema, cohortId: z.string().uuid("클래스를 선택해 주세요.") })`
    - Remove the now-stale `MAX_DISPLAY_NAME_LENGTH` export
  - Modify `features/onboarding/api/schema.test.ts` — replace length-50 cases with the new policy cases (use Task 1's matrix, applied through the wrapped object schema)
  - Modify `features/onboarding/ui/onboarding-form.tsx`:
    - Replace inline `validate()` length checks with `displayNameSchema.safeParse(displayName)`; on failure surface the first issue's message into `displayNameError`
    - Drop the import of `MAX_DISPLAY_NAME_LENGTH`
  - Modify `features/onboarding/ui/onboarding-form.test.tsx` — update the existing "too long" / "empty" / "happy path" assertions to match new policy values and messages; add cases for character violations and underscore acceptance
  - Modify `features/onboarding/api/actions.test.ts` — adjust the "rejects display names longer than 50 characters" case and any other input fixtures so they reflect the new boundary (e.g. `"a".repeat(13)` instead of `"a".repeat(51)`)
- **Acceptance**:
  - [ ] Submitting `"Alice_99"` on the onboarding form with a valid cohort selected → `completeOnboarding` is invoked with `{ displayName: "Alice_99", cohortId }` and the user is routed to `initialNext` (verifies Scenario 1 happy path)
  - [ ] Submitting `"  Alice  "` → server action receives the trimmed value `"Alice"` (whitespace-stripping is observable through the value passed to the action)
  - [ ] Submitting `"a"` → submission is blocked, the field shows `DISPLAY_NAME_POLICY_MESSAGE`, `completeOnboarding` is not called
  - [ ] Submitting `"abcdefghijklm"` (13 chars) → same blocked outcome with the policy message
  - [ ] Submitting `"Alice!"` (special character) → same blocked outcome with the policy message
  - [ ] Submitting `"Alice K"` (inner whitespace) → same blocked outcome with the policy message
  - [ ] Submitting `"ㄱㄴ"` (standalone jamo) → same blocked outcome with the policy message
  - [ ] Submitting empty / whitespace-only input → field shows `DISPLAY_NAME_REQUIRED_MESSAGE` (the existing empty message, not the new policy message)
  - [ ] Previously entered value remains in the input after a validation error
  - [ ] Server-side: calling `completeOnboarding({ displayName: "Alice!", cohortId: <valid-uuid> })` directly (skipping the form) returns `{ ok: false, error: <DISPLAY_NAME_POLICY_MESSAGE> }` and no row is upserted — proves the invariant that the server cannot be bypassed by skipping the client
  - [ ] Existing duplicate handling preserved: when `supabase.from('profiles').upsert(...)` returns a Postgres `unique_violation` on `profiles_display_name_ci_unique`, the action returns `{ ok: false, error: DISPLAY_NAME_TAKEN_MESSAGE }` (the existing assertion in `actions.test.ts` continues to pass after schema migration)
  - [ ] `MAX_DISPLAY_NAME_LENGTH` symbol no longer exists in `features/onboarding/api/schema.ts`
- **Verification**:
  - `bun run test:unit -- features/onboarding`
  - `bun run typecheck`
  - Browser MCP — open the onboarding route after fresh signup, enter each invalid case, capture screenshots of the error state; save to `artifacts/nickname-policy/evidence/task-2-onboarding-errors.png`

---

### Task 3: Apply the new policy to the settings flow ✅

- **Covers**: Scenario 3 (full — settings is the primary duplicate-rejection path; covers case-insensitive and trim-aware variants plus the self-save edge case), Scenario 2 (partial — settings side), Scenario 4 (partial — settings initial-display read-side test; project-card and routing aspects are addressed at the checkpoint, see below), Invariant "Server-side enforcement" (settings action), Invariant "Write-only enforcement" (settings reads bypass schema; initial render of a non-compliant stored value does not auto-error)
- **Size**: M (4 files)
- **Dependencies**: Task 1 (schema must exist via `@entities/profile`)
- **References**:
  - test-driven-development — adjust the existing `settings-form.test.tsx` and `actions.test.ts` first
  - frontend-ui-engineering — same `<Field>` / `<Input>` pattern as onboarding; align client-side validation behaviour across the two forms
- **Implementation targets**:
  - Modify `features/settings/api/schema.ts`:
    - Re-export `displayNameSchema` from `@entities/profile` (drop the `@features/onboarding` import that violates slice isolation)
  - Modify `features/settings/ui/settings-form.tsx`:
    - Add a pre-submit client-side validation call to `displayNameSchema.safeParse(displayName)`; on failure set the local `error` state to the issue message and skip the server action (mirrors onboarding's pattern)
    - Keep the existing server-error path for duplicate-message and unknown errors
  - Modify `features/settings/ui/settings-form.test.tsx`:
    - Add cases mirroring the onboarding form matrix for the new policy
    - Add a case: render with `initialDisplayName="x"` (a value that would fail the new policy because it was stored before the policy change) → the input shows `"x"`, the form does not auto-flag an error on mount (Scenario 4)
  - Modify `features/settings/api/actions.test.ts` — adjust the "rejects display names longer than 50 characters" case and any other input fixtures so they reflect the new boundary; add a case for character violation and one for underscore acceptance
- **Acceptance**:
  - [ ] Submitting `"Bob_123"` from settings → `updateDisplayName` succeeds, the success toast appears, and `router.refresh` is invoked (verifies Scenario 3 happy path)
  - [ ] Submitting `"a"` from settings → field shows `DISPLAY_NAME_POLICY_MESSAGE`, `updateDisplayName` is not called
  - [ ] Submitting `"abcdefghijklm"` (13 chars) → blocked outcome with policy message
  - [ ] Submitting `"Alice!"` (special character) → blocked outcome with policy message
  - [ ] Submitting empty input → field shows `DISPLAY_NAME_REQUIRED_MESSAGE`
  - [ ] Server-side: calling `updateDisplayName("Alice!")` directly returns `{ ok: false, error: { field: "displayName", message: <DISPLAY_NAME_POLICY_MESSAGE> } }` and no DB update happens
  - [ ] Rendering `<SettingsForm initialDisplayName="x" ...>` (a stored value that would fail the new policy) → the input contains `"x"` and no error is displayed on mount (Scenario 4: read-side compatibility)
  - [ ] Submitting `"alice"` when another user already has `"Alice"` (mock the Supabase `update` response with a `unique_violation` on `profiles_display_name_ci_unique`) → the form surfaces `DISPLAY_NAME_TAKEN_MESSAGE` ("이미 사용 중인 닉네임이에요.") and no router refresh fires (Scenario 3 case-insensitive duplicate)
  - [ ] Submitting `"  Alice  "` with the same mocked unique-violation → same duplicate message after trim (Scenario 3 trim-aware duplicate)
  - [ ] Submitting one's OWN current nickname `"Alice"` (any case variation, e.g. `"alice"`) → `updateDisplayName` is called; if Supabase reports success (no unique-violation because the row being updated is the user's own), the form shows the success toast without surfacing a duplicate error (Scenario 3 self-save)
  - [ ] After any validation error from `displayNameSchema.safeParse`, the previously entered value remains in the input field (Scenario 2: input preservation in settings)
  - [ ] `features/settings/api/schema.ts` no longer imports from `@features/onboarding` (slice isolation restored)
- **Verification**:
  - `bun run test:unit -- features/settings`
  - `bun run typecheck`
  - Browser MCP — sign in, open `/settings`, attempt each invalid case, capture screenshots of the error state and one successful update; save to `artifacts/nickname-policy/evidence/task-3-settings-errors.png` and `artifacts/nickname-policy/evidence/task-3-settings-success.png`

---

### Checkpoint: After Tasks 1–3 ✅
- [x] All tests pass: `bun run test` (Vitest 496 / pgTAP 152)
- [x] Build succeeds: `bun run build`
- [x] **Uniqueness invariant preserved (pgTAP)**: `bun run test:db` passes — `profiles_test.sql` still covers `profiles_display_name_ci_unique`.
- [x] **Write-only enforcement (grep audit)**: confirmed schema/messages only appear under `entities/profile/**`, `features/onboarding/**`, `features/settings/**`.
- [x] No lingering references to `MAX_DISPLAY_NAME_LENGTH`.
- [ ] **Scenario 4 read-side behaviour (manual via Browser MCP)**: deferred. Unit test in `features/settings/ui/settings-form.test.tsx` ("displays a legacy non-compliant stored nickname without auto-erroring on mount") covers the settings side. Project-card path is structurally unchanged (no read-side schema import — grep audit above proves this).
- [ ] Duplicate-message end-to-end (Browser MCP): deferred. Covered by unit tests in `features/settings/ui/settings-form.test.tsx` ("surfaces the server duplicate error..." and "self-save: succeeds...") which mock the unique-violation response shape.

---

## Undecided Items

None.
