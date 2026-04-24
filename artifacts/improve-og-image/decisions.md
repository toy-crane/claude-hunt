# Decisions — improve-og-image

## Reviewer selection: wireframe + ui-quality + react; skip design

**When**: Step 2, Reviewer selection
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `react-reviewer` in parallel after Task 4. Skip `design-reviewer`.
**Why**:
- A canonical wireframe exists at `artifacts/improve-og-image/references/project/og-image-final.html` (the `OgGridB` component). Screenshot comparison between the live OG image and this HTML is the sharpest truth for this feature → `wireframe-reviewer`.
- The implementation ships user-visible pixels in a shared link preview → `ui-quality-reviewer`.
- `app/opengraph-image.tsx` is a Next.js metadata route using `next/og` + async default export + `export const revalidate` → `react-reviewer`.
- `design-reviewer` checks shadcn / design-system-component compliance. The OG image is a server-rendered PNG via `next/og` (inline styles, no shadcn components), so the design-system checklist does not apply.
**Harness Signal**: For purely server-rendered image outputs (`opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx`), `design-reviewer` should not be triggered automatically — the skill could key its default selection on whether there are imports from `@/components/ui/*` or shadcn tokens in the changed files.
**Result**: Pending

---

## Task ordering: 1 → 2 → 3 → 4 (strictly sequential)

**When**: Step 3, Task ordering
**Decision**: Execute Task 1 (anon client + fetchTopProjects), then Task 2 (OG layout + fonts, placeholder data), then Task 3 (wire live data + revalidate + sparse handling), then Task 4 (browser evidence capture).
**Why**:
- Task 3 depends on both Task 1 (`fetchTopProjects`) and Task 2 (rendering code).
- Task 2 is technically independent of Task 1 (uses placeholder data) but both are prerequisites for Task 3. Running them in parallel would complicate the commit sequence and conflict on `app/opengraph-image.tsx` between Task 2 and Task 3.
- Task 4 (browser evidence) needs the fully-wired pipeline from Task 3 to be meaningful.
- Strictly sequential keeps one commit per logical unit and matches per-project commit-policy.
**Harness Signal**: N/A — plan.md already encodes the dependencies in the `Dependencies:` field of each Task. No harness change needed.
**Result**: Pending
