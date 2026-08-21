# Legacy project image schema remains after the multi-image rollout

**Symptom**: `public.projects` still contains nullable `screenshot_path`, while `images` has no database constraint enforcing the application's one-to-five image contract.

**Observed evidence**: `supabase/schemas/projects.sql` labels `screenshot_path` as an Expand-phase legacy column and says it will be dropped later; the same file says the `images` length check belongs in the Contract scope. `entities/project/model/constants.ts` enforces `MAX_PROJECT_IMAGES = 5` only in application validation.

**Suspected cause**: The multi-image Expand and backfill migrations shipped, but the final Contract migration was never completed after all read and write paths moved to `images`.

**What was tried**: Existing rows were backfilled into `images`, new writes use the array, and `projects_with_vote_count` now reads its primary image from `images[0]`. The legacy base column and missing database check were intentionally left unchanged during that rollout.

**Proposed next step**: Verify production has no empty or oversized `images` arrays and no remaining consumer of `screenshot_path`, then shape and ship the Contract migration that adds a one-to-five array-length check and drops `screenshot_path`.
