# Automatically captured highlights appear late on cached project pages

**Symptom**: After a highlight run appends images to a published project, the detail page and board can keep showing only the first screen for about a minute or more, even when reloaded after the run ended.

**Observed evidence**: Local dev on 2026-10-21 (`docs/specs/auto-project-images/`). For project `21b67ecf…` the run finished with 5 images in the database at 04:18, yet two full reloads around 04:19–04:21 still rendered one image; a later request showed all five. A second timeline for project `4cde8cd9…` polled every 10 s: the database went 1→5 images over two minutes while the served HTML lagged it (1, then 3, then 5) by 20–60 s, matching `cacheLife("minutes")` stale-while-revalidate rather than the explicit invalidation.

**Suspected cause**: `createAutoImageStore().refresh()` calls `revalidateTag(CACHE_TAGS.PROJECTS, { expire: 0 })` inside the `after()` task started by the submit/edit Server Action. Next.js collects revalidations made in `after()` and executes them only once the whole after queue is idle (`withExecuteRevalidates` in `next/dist/server/revalidation-utils.js`), i.e. after the two-minute run and the ~25 s sandbox stop; in this run they produced no visible refresh at all.

**What was tried**: Kept the per-append `refresh()` calls (harmless) and relied on the existing `cacheLife("minutes")` window, which does surface the images within roughly a minute of being added. Acceptance criterion 4 (images within 3 minutes of publishing) held; criterion 5 ("reload shows added images") holds only after the cache window rolls over.

**Proposed next step**: Invalidate from a request context the background run can reach, e.g. have the run call a token-protected Route Handler that runs `revalidateTag(CACHE_TAGS.PROJECTS, { expire: 0 })` after each append (deciding how preview deployments behind Vercel Authentication are reached), then confirm with the same DB-vs-HTML timeline that HTML matches the database within seconds.
