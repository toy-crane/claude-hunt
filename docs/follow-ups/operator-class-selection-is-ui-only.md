# Operator-only class selection is enforced only in the UI

**Symptom**: A crafted onboarding or settings request can assign the signed-in profile to the operator-only TOYCRANE class even though the product treats that class as unavailable for user selection.

**Observed evidence**: `features/onboarding/ui/onboarding-form.tsx` and `features/settings/ui/settings-form.tsx` filter options with `isSelectableCohort`, but `features/onboarding/api/actions.ts` and `features/settings/api/actions.ts` accept any UUID and write it to `profiles.cohort_id` without loading the class or checking its stable name.

**Suspected cause**: The non-selectable rule was introduced as a presentation filter and was never promoted to the server mutation boundary.

**What was tried**: `entities/cohort/model/selectable.ts` centralizes the TOYCRANE name rule and both forms reuse it, which prevents ordinary UI selection but leaves direct requests unchanged.

**Proposed next step**: Shape a server-side selection policy shared by onboarding and settings, reject TOYCRANE and unknown class IDs before updating the profile, and add action-level tests that bypass the UI.
