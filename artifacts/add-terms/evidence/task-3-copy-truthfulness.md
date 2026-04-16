# Task 3 — Copy truthfulness review

Checked the factual claims on `/privacy` against the current codebase at commit time:

## Section 3 — "회원 탈퇴 시 저장된 개인정보를 지체 없이 파기합니다."
Source of truth: `features/withdraw-user/api/actions.ts:16-51`.
- The action deletes storage files first (`storage.from(SCREENSHOT_BUCKET).remove(paths)` at line 37), then calls `auth.admin.deleteUser(user.id)` at line 41 which cascades through `profiles → projects → votes` FKs.
- No soft-delete, no grace period, no scheduled cleanup → "지체 없이" is accurate.

## Section 7 — "데이터베이스는 전자적 삭제, 스토리지 파일은 즉시 제거, 탈퇴 즉시 실행"
Same source — matches the code behavior exactly.

## Section 9 — Automatic collection
Source of truth: `app/layout.tsx:8-9, 75-76`.
- Imports `Analytics` from `@vercel/analytics/next` and `SpeedInsights` from `@vercel/speed-insights/next`, renders both in `<body>`.
- Supabase auth session cookie is set by `@supabase/ssr` via `proxy.ts:31-50` (the cookie adapter writes on every refresh).
- Disclosure of all three items on the page matches reality.

## Conclusion
Privacy policy §3, §7, §9 are consistent with the codebase as of this feature's merge. Any future change to `features/withdraw-user` behavior (grace periods, soft delete) or to `app/layout.tsx` analytics wiring must update these sections in the same PR.
