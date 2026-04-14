# Image Upload — Implementation Plan

## Context

Project Board's screenshot upload currently rejects any file over 5 MiB, blocking typical phone/DSLR photos. The spec at `artifacts/image-upload/spec.md` raises the accepted source cap to 25 MiB and introduces a client-side downscale + re-encode step (longest side ≤ 1920 px, WebP, ~85% quality) before the upload hits Supabase Storage. If the browser can't decode/downscale, the upload is rejected — no raw fallback. Applies to both submit-project and edit-project flows (both already share `uploadScreenshot`, so wiring the downscale in the shared helper covers both flows automatically).

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Downscale implementation | Native browser APIs — `createImageBitmap` + `OffscreenCanvas` + `convertToBlob` | `browser-image-compression` (v2.0.2, March 2023) is stale with 51 open issues. Native APIs now cover the full need: `createImageBitmap(file, { imageOrientation: 'from-image' })` handles EXIF orientation; `OffscreenCanvas` + `convertToBlob({ type: 'image/webp', quality: 0.85 })` handles resize and WebP encoding. Supported in all targeted browsers (Chrome 69+, Firefox 105+, Safari 16.4+). Zero new dependencies, no maintenance risk. |
| Helper placement | `shared/lib/image/` | Both `features/submit-project` and `features/edit-project` need it; FSD forbids cross-slice sibling imports. |
| Bucket `file_size_limit` | **Unchanged** at 5 MiB | The stored object is always the downscaled WebP (~100–800 KiB). 25 MiB is a client-side source cap on the raw picked file; it never reaches the bucket. Existing pgTAP `storage_project_screenshots_test.sql:27` already asserts this cap — the "Server-side defence" invariant is covered without new tests. |
| Stored file extension | Always `.webp` | All stored files are WebP post-downscale; keeps the path's extension honest. |
| Source MIME allow-list | Unchanged: JPEG / PNG / WebP | Rejects garbage before the decoder runs; three-layer defence covers the MIME-safety invariant: (1) client `validateScreenshotFile`, (2) `<input accept="">` on both submit-form and edit-dialog, (3) bucket-level `allowed_mime_types` (already asserted in pgTAP). |
| Re-encode small images | Always re-encode to WebP | Simpler rule; Scenario 1 SC requires `image/webp` content type for stored output; Scenario 5's SC is satisfied trivially by the same pipeline. |
| Testing boundary | Vitest for validator + helper error paths (mocked lib) + upload-screenshot call-shape (mocked Supabase); Playwright for real pixel/dim/content-type assertions against live Storage | jsdom has no real canvas; the `≤ 1920 px` and `image/webp` criteria are only honestly provable in a real browser against real Storage. |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| `project-screenshots` bucket | Storage bucket | `supabase/config.toml` (existing) | No change |

No new runtime resources and no new npm dependencies.

## Data Model

No data-model changes. All changes are client-side behavior plus client-facing constants. The existing `projects.screenshot_path` column continues to store a storage path; only the extension in the path changes from `.jpg/.png/.webp` (source-derived) to `.webp` (fixed).

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | RED → GREEN per Success Criterion; each acceptance bullet maps to a test. |
| `frontend-ui-engineering` | Task 1, Task 2 | Form hint text + error surface updates. |
| `security-and-hardening` | Task 2 | File-type validation runs before decode; no raw upload fallback. |
| `fsd` | Task 2 | New `shared/lib/image/` slice, barrel via `index.ts`, no cross-slice sibling imports. |
| `source-driven-development` | Task 2 | Confirm API signatures against MDN: `createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth?, resizeHeight? })`, `new OffscreenCanvas(w, h)`, `canvas.getContext('2d').drawImage(...)`, `canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })`. Verify browser support matrix before coding. |
| `supabase` | (reference only) | No schema change; bucket stays put. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `features/submit-project/api/schema.ts` | Modify | Task 1 |
| `features/submit-project/api/schema.test.ts` | Modify | Task 1 |
| `features/submit-project/ui/submit-form.tsx` | Modify | Task 1 |
| `features/submit-project/ui/submit-form.test.tsx` | Modify (additive across Task 1 & Task 2 — no conflicts) | Task 1, Task 2 |
| `shared/lib/image/downscale.ts` | New | Task 2 |
| `shared/lib/image/downscale.test.ts` | New | Task 2 |
| `shared/lib/image/index.ts` | New | Task 2 |
| `features/submit-project/lib/upload-screenshot.ts` | Modify | Task 2 |
| `features/submit-project/lib/upload-screenshot.test.ts` | New | Task 2 |
| `e2e/fixtures/large-screenshot.jpg` | New (commit binary) | Task 3 |
| `e2e/fixtures/small-screenshot.png` | New (commit binary, 800×600, < 500 KiB) | Task 3 |
| `e2e/project-board.spec.ts` | Modify | Task 3 |

> **Note:** `features/edit-project/` is intentionally absent from Affected Files. The edit-dialog imports `uploadScreenshot` directly from `@features/submit-project`; all behavioral changes to that shared helper flow through automatically. Task 3's edit-flow E2E is the single point where the edit path's behavior is proven end-to-end.

## Fixture Generation (Task 3 prerequisite)

The two E2E fixtures must be committed as real binary bytes (not generated at test time). Generate once locally, then `git add` them:

- **`e2e/fixtures/large-screenshot.jpg`** — ≥ 12 MiB, ≥ 4032×3024, JPEG. Use a high-quality CC0 stock photo (Pexels/Unsplash) saved at quality ≥ 95, or ImageMagick: `convert -size 4032x3024 plasma:fractal -quality 98 e2e/fixtures/large-screenshot.jpg` (plasma produces high-entropy content that does not compress small).
- **`e2e/fixtures/small-screenshot.png`** — 800×600 PNG, < 500 KiB. `convert -size 800x600 plasma:fractal e2e/fixtures/small-screenshot.png` is sufficient.

Verify before committing: `ls -lh e2e/fixtures/` to confirm sizes.

## Tasks

### Task 1: Raise source-file cap to 25 MiB + update form hint

- **Covers**: Scenario 2 (full — reject above cap, no upload, fields preserved)
- **Size**: S (4 files)
- **Dependencies**: None
- **References**:
  - `test-driven-development` — extend `schema.test.ts` first with a 30 MiB case before flipping the constant
- **Implementation targets**:
  - `features/submit-project/api/schema.ts` — `MAX_SCREENSHOT_BYTES = 25 * 1024 * 1024`; error string `"File must be 25 MB or smaller"`
  - `features/submit-project/api/schema.test.ts` — add/adjust cases asserting the 25 MB boundary + new error string
  - `features/submit-project/ui/submit-form.tsx:151` — hint text `"JPEG, PNG, or WebP up to 25 MB."`
  - `features/submit-project/ui/submit-form.test.tsx` — new test: user types title/tagline/URL, picks a 30 MiB file, clicks submit → field-error alert shows the 25 MB string, `submitProject` mock is not called, title/tagline/URL input values remain populated
- **Acceptance**:
  - [ ] `validateScreenshotFile` on a 30 MiB file → `{ ok: false, error: "File must be 25 MB or smaller" }`
  - [ ] `validateScreenshotFile` on a 24 MiB JPEG → `{ ok: true }`
  - [ ] Submit form renders hint text "JPEG, PNG, or WebP up to 25 MB."
  - [ ] When `uploadScreenshot` returns the size error, the form's field-error alert displays that exact string and `submitProject` is not called (existing pattern)
  - [ ] After the size rejection, the title / tagline / projectUrl input values the user already typed remain populated (not cleared by the error path)
- **Verification**:
  - `bun run test:unit -- schema`
  - `bun run test:unit -- submit-form`
  - `bun run build`

---

### Task 2: Add `downscaleImage` helper and wire into upload pipeline

- **Covers**: Scenario 1 (partial — flow wiring; pixel proof in Task 3), Scenario 3 (full — decode rejection, no upload, retry), Scenario 5 (partial — flow wiring; pixel proof in Task 3). Also enforces the "Storage shape" and "MIME safety" invariants at the shared-code layer.
- **Size**: M (5 files)
- **Dependencies**: Task 1 (keeps the cap-raise diff clean and separate)
- **References**:
  - `source-driven-development` — MDN: [createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap) (confirm `imageOrientation: 'from-image'` option), [OffscreenCanvas.convertToBlob](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob) (confirm `{ type: 'image/webp', quality }` shape)
  - `fsd` — new `shared/lib/image/` slice with barrel; no cross-slice sibling imports
- **Implementation targets**:
  - `shared/lib/image/downscale.ts` — export `downscaleImage(file: File): Promise<{ ok: true; file: File } | { ok: false; error: string }>`. Pipeline: `createImageBitmap(file, { imageOrientation: 'from-image' })` → compute target dims preserving aspect ratio with `max(width, height) ≤ 1920` → `new OffscreenCanvas(targetW, targetH)` → `ctx.drawImage(bitmap, 0, 0, targetW, targetH)` → `canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })` → wrap in `new File([blob], stem + '.webp', { type: 'image/webp' })`. Wrap the whole pipeline in try/catch; on any thrown error return `{ ok: false, error: "Could not process this image. Try a different file." }`. Skip downscale math when source ≤ 1920 on both axes but still re-encode to WebP (Invariant: stored always WebP).
  - `shared/lib/image/downscale.test.ts` (colocated) — `vi.stubGlobal('createImageBitmap', ...)` and `vi.stubGlobal('OffscreenCanvas', class {...})`. Cases: (a) source 4000×3000 → helper constructs an `OffscreenCanvas(1920, 1440)` and returns a `File` with type `image/webp` and name ending in `.webp`; (b) source 800×600 → helper constructs an `OffscreenCanvas(800, 600)` (no upscale) and still returns a WebP file; (c) `createImageBitmap` rejects → helper returns the exact decode-failure error string; (d) `convertToBlob` rejects → same decode-failure string.
  - `shared/lib/image/index.ts` — barrel: `export { downscaleImage } from "./downscale.ts"`
  - `features/submit-project/lib/upload-screenshot.ts` — after `validateScreenshotFile`, call `downscaleImage(file)`; on `ok: false`, return its error; on `ok: true`, upload the returned file; object path uses `.webp` extension (drop the source extension)
  - `features/submit-project/lib/upload-screenshot.test.ts` (new) — mocks `createClient` and `downscaleImage`: asserts (a) invalid MIME → error returned, `storage.from(...).upload` never called; (b) valid file + downscale fails → decode error returned, upload never called; (c) valid file + downscale succeeds → upload called exactly once with a `File` whose name ends in `.webp`, returns `{ path }` ending in `.webp`
  - `features/submit-project/ui/submit-form.test.tsx` — add a test mocking `uploadScreenshot` to return the decode-failure error string, asserting it surfaces in the field-error alert; and a retry test: after a first submission fails with decode error, the form stays mounted (no refresh) and a subsequent submit with a different mocked result proceeds normally
- **Acceptance**:
  - [ ] Helper with a stubbed 4000×3000 source → `OffscreenCanvas` is constructed with dims `1920×1440` (aspect ratio preserved, longest side ≤ 1920); returns `{ ok: true, file }` where `file.type === "image/webp"` and `file.name` ends in `.webp`
  - [ ] Helper with a stubbed 800×600 source → `OffscreenCanvas` is constructed with dims `800×600` (no upscale); returns a WebP file
  - [ ] Helper when `createImageBitmap` rejects → returns `{ ok: false, error: "Could not process this image. Try a different file." }`
  - [ ] Helper when `convertToBlob` rejects → returns the same decode-failure string
  - [ ] `uploadScreenshot` with an invalid MIME → returns MIME error and `storage.from(...).upload` is never called
  - [ ] `uploadScreenshot` when downscale fails → returns decode error and `storage.from(...).upload` is never called
  - [ ] `uploadScreenshot` happy path → `storage.from(...).upload` is called exactly once with a File whose name ends in `.webp`; returned `path` ends in `.webp`
  - [ ] When `uploadScreenshot` surfaces the decode-failure error, the submit form's field-error alert displays `"Could not process this image. Try a different file."` and `submitProject` is not called
  - [ ] After a decode failure, the user can trigger submit again (with a mocked successful upload on the retry) and the flow proceeds without a page refresh — no React unmount/remount of the form
- **Verification**:
  - `bun run test:unit -- shared/lib/image`
  - `bun run test:unit -- upload-screenshot`
  - `bun run test:unit -- submit-form`
  - `bun run build`

---

### Checkpoint: After Tasks 1–2
- [ ] `bun run test` passes (Vitest + pgTAP — pgTAP's `storage_project_screenshots_test.sql:27` still asserts the 5 MiB bucket cap; leaving it proves the "Server-side defence" invariant)
- [ ] `bun run build` succeeds
- [ ] Manual smoke: start dev server, sign in, submit with a ≤ 25 MiB image → screenshot renders on the new card; try a 30 MiB file → see the updated 25 MB error string

---

### Task 3: E2E — real source bytes become compliant stored output on submit, edit, and small-image paths

- **Covers**: Scenario 1 (full), Scenario 4 (full), Scenario 5 (full — small-image end-to-end)
- **Size**: M (3 files: 2 fixture binaries + 1 spec modification)
- **Dependencies**: Task 2 (the pipeline must exist)
- **References**:
  - `CLAUDE.md` → Testing → E2E preconditions (Supabase running, `SUPABASE_SECRET_KEY`, `bunx playwright install chromium`)
  - `browser-testing-with-devtools` — inspect the served image's natural dimensions and `Content-Type` header
- **Implementation targets**:
  - `e2e/fixtures/large-screenshot.jpg` (new, ≥ 12 MiB, ≥ 4032×3024; see Fixture Generation section above)
  - `e2e/fixtures/small-screenshot.png` (new, 800×600, < 500 KiB)
  - `e2e/project-board.spec.ts`:
    - Extend the submit spec (around lines 77–103) to use `large-screenshot.jpg`. After the new card appears, evaluate in the browser: `img.naturalWidth` and `img.naturalHeight` both ≤ 1920; `fetch(img.src, { method: 'HEAD' })` returns `content-type: image/webp` and `content-length < 1_000_000`.
    - Add a second submit case using `small-screenshot.png` (800×600): new card appears, image renders (naturalWidth > 0), `content-type: image/webp` (proves re-encode runs for small images too).
    - Extend the edit spec (around lines 115–122) to replace with `large-screenshot.jpg` and assert the same three invariants on the updated card.
    - Add a negative edit case: intercept the storage upload with `page.route(...)` to force a 500; verify the card still displays the original screenshot URL (no broken image, no URL change).
- **Acceptance**:
  - [ ] Submit with `large-screenshot.jpg` (≥ 12 MiB / ≥ 4032×3024) → new card screenshot's `naturalWidth ≤ 1920` and `naturalHeight ≤ 1920`
  - [ ] That same card's served screenshot has `content-type: image/webp` and `content-length < 1_000_000`
  - [ ] Submit with `small-screenshot.png` (800×600, < 500 KiB) → card appears and the served screenshot has `content-type: image/webp` (Scenario 5 end-to-end)
  - [ ] Edit flow with `large-screenshot.jpg` → card updates; updated image also satisfies `naturalWidth ≤ 1920`, `naturalHeight ≤ 1920`, `content-type: image/webp`
  - [ ] Edit-flow failure: when the storage upload is intercepted to return 500, the card's `<img>` src is unchanged from the pre-edit URL (no broken image)
- **Verification**:
  - `bun run test:e2e -- project-board`
  - Confirm no regression in existing assertions of `e2e/project-board.spec.ts`

---

### Checkpoint: After Task 3 (final)
- [ ] `bun run test` passes (fast tier)
- [ ] `bun run test:e2e` passes
- [ ] `bun run build` succeeds
- [ ] Manual smoke against `bun dev`: submit with a ≥ 15 MiB phone photo; verify the card renders a crisp image and the Network tab shows a `< 1 MB` WebP response for the stored object
- [ ] Coverage sweep: every Success Criterion in spec.md Scenarios 1–5 has at least one Acceptance bullet across Tasks 1–3; all three Invariants are covered (Storage shape → Task 3; Server-side defence → existing pgTAP retained; MIME safety → Task 2 shared-helper tests + preserved `<input accept="">` + preserved bucket MIME list)

---

## Verification (end-to-end)

1. `bun run test` — Vitest + pgTAP green
2. `bun run test:e2e` — Playwright green (Supabase running, `SUPABASE_SECRET_KEY` set)
3. `bun run build` — Next build succeeds
4. `bun dev` then manually: sign in, submit with a ~15 MiB source; inspect the served screenshot's `Content-Type` (`image/webp`) and dimensions (`≤ 1920 px`) in DevTools → Network

## Undecided Items

None — all clarifications resolved during `/write-spec` and the dependency + reviewer-gap passes in this session.
