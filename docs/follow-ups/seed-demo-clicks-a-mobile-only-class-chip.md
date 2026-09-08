# The seed-demo class filter tests click a chip that desktop never renders

**Symptom**: Five tests in `e2e/seed-demo.spec.ts` time out waiting for a class chip that is not displayed at the viewport Playwright runs them in, so the seeded class filter is not covered by any passing test.

**Observed evidence**: `bun run test:e2e` fails `cohort filter 'LGE-1' / 'LGE-2' / 'Inflearn' surfaces its seeded project`, `cohort filter 'LGE-3' surfaces no seeded cards`, and `restoring 'All cohorts' restores all three seeded cards`, each with `locator.click: Test timeout ... waiting for getByTestId('cohort-chips').getByRole('button', ...)`. The spec runs under the `chromium` project's `devices["Desktop Chrome"]` viewport (1280x720), and in the browser at that width `[data-testid="cohort-chips"]` computes to `display: none` because `app/(chrome)/_components/project-board.tsx` renders `CohortChips` with `className="mb-3 min-[720px]:hidden"` and shows `CohortCombobox` instead.

**Suspected cause**: `2ff881a feat(project-board): 데스크톱 툴바 배치 및 보드 상단 간격 개편` (2026-07-17) made the chip rail mobile-only and introduced the desktop combobox, but `e2e/seed-demo.spec.ts` was not moved to either a mobile viewport or the combobox.

**What was tried**: Nothing was changed. The failure was isolated during the Korean typography work and confirmed to be independent of it: `git diff main..HEAD` touches neither `project-board.tsx` nor `seed-demo.spec.ts`, and the chip rail is hidden by a breakpoint that predates that branch.

**Proposed next step**: Decide whether the seeded class filter should be proven through the mobile chip rail or the desktop combobox, then either set a sub-720px viewport on that describe block or drive `[data-testid="cohort-combobox-trigger"]`, and confirm all five tests pass under `bun run test:e2e`.
