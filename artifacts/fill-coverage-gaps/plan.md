# Fill Coverage Gaps & Cleanup

테스트 구성 점검(2026-05-11)에서 식별된 6개 항목을 한 워크트리에서 처리한다. 새로운 기능을 추가하지 않으며, 회귀 방지망을 확장하고 죽은 fixture 한 개를 정리하는 게 목표.

## Goals

1. 서버 액션 2종(`delete-comment`, `toggle-reaction`) 단위 테스트 보강 — 권한·분기·RLS 분기를 호출처 모킹 수준에서 검증
2. `app/projects/[id]/edit/page.tsx`의 server-side **owner-only 게이트** 단위 검증
3. `edit-project` schema 검증 보강 — `projectFieldsSchema` 위에 얹은 `projectId` 분기까지
4. `isDisplayNameUniqueViolation` 헬퍼의 분기 단독 unit 추가 (조건부 — 아래 Task 5 참고)
5. `e2e/fixtures/test-screenshot.png` 죽은 파일 삭제

## Non-Goals

- 새로운 E2E 케이스 추가 — 본 워크트리는 모두 Vitest 영역
- `entities/*/model/schema.ts`, `shared/ui/*`, `shared/api/supabase/*` adapter 테스트화 — 의도된 갭이라 그대로 둔다
- 커버리지 thresholds 도입, CI 워크플로 추가 — 별도 작업
- 코드(소스) 동작 변경 — 모킹 발견 시 발견 사실만 보고하고 수정은 별도 브랜치

## Tasks

각 Task는 **1 커밋 / `test:` 접두사**. TDD 순서: 가장 의존성 적은 것 → 큰 것.

### Task 1 — 죽은 fixture 삭제

- **Why**: `e2e/fixtures/test-screenshot.png` (69 B). grep 결과 참조 0건. `large-screenshot.jpg`, `small-screenshot.png`만 사용됨
- **Change**: 파일 삭제
- **Verify**: `bun run test:unit` 통과 + `grep -r test-screenshot e2e/ → 0`
- **Commit**: `chore(e2e): remove unused test-screenshot.png fixture`

### Task 2 — `editProjectInputSchema` 단위 테스트

- **File (new)**: `features/edit-project/api/schema.test.ts`
- **Pattern**: `features/submit-project/api/schema.test.ts` 미러
- **Cases**:
  - 잘 갖춰진 입력 통과 (projectId + 모든 fields)
  - projectId 누락 → 실패
  - projectId 공백만 → 실패 (`min(1)` after `trim()`)
  - title 공백만 → 실패
  - projectUrl 비URL → 실패
  - title 80자 초과 → 실패
  - tagline 길이 초과 → 실패
  - imagePaths 빈 배열 → 실패
- **Verify**: `bun run test:unit features/edit-project` 8 PASS
- **Commit**: `test(edit-project): cover editProjectInputSchema fields and projectId`

### Task 3 — `deleteComment` 서버 액션 단위 테스트

- **File (new)**: `features/delete-comment/api/actions.test.ts`
- **Mock 경계**: `@shared/api/supabase/require-auth`, `next/cache`
- **Cases**:
  - `commentId` 누락 → `{ok:false, error:"Invalid input"}`, requireAuth 미호출
  - `projectId` 누락 → 동일
  - 미인증 (`requireAuth` `{ok:false}`) → 그 결과 그대로 반환, DB 미호출
  - 성공 (`select("id")` 결과 1행) → `{ok:true}`, `revalidatePath("/projects/<id>")` 호출 확인
  - RLS로 0행 삭제 → `"Comment not found or you don't have permission..."` 메시지
  - Supabase error → 메시지 그대로 surface
- **Verify**: `bun run test:unit features/delete-comment` 6 PASS
- **Commit**: `test(delete-comment): cover input/auth/RLS branches in deleteComment`

### Task 4 — `toggleReaction` 서버 액션 단위 테스트

- **File (new)**: `features/toggle-reaction/api/actions.test.ts`
- **Mock 경계**: `@shared/api/supabase/require-auth`, `next/cache`, `./schema`(필요 시)
- **Cases**:
  - zod 실패 (잘못된 emoji) → `{ok:false, error}` + DB 미호출
  - 미인증 → requireAuth 결과 그대로 반환
  - 기존 reaction 없음 → `insert` 호출 + `{ok:true, state:"added"}`
  - 기존 reaction 있음 → `delete(eq id)` 호출 + `{ok:true, state:"removed"}`
  - insert DB error → 메시지 surface, state 미포함
  - delete DB error → 메시지 surface, state 미포함
  - 성공 시 `revalidatePath("/projects/<projectId>")` 호출 (added/removed 모두)
- **Verify**: `bun run test:unit features/toggle-reaction` 7 PASS
- **Commit**: `test(toggle-reaction): cover schema/auth/toggle paths in toggleReaction`

### Task 5 — `isDisplayNameUniqueViolation` helper unit — **SKIP**

- **Decision (2026-05-11 review)**: 스킵 확정
- **Why**: 호출처 두 곳(`features/settings/api/actions.test.ts:109-144`, `features/onboarding/api/actions.test.ts:149-183`)이 이미 매칭/비매칭 분기를 검증. 단독 unit은 중복

### Task 6 — `app/projects/[id]/edit/page.tsx` server-side 가드 테스트

- **File (new)**: `app/projects/[id]/edit/page.test.tsx`
- **참고**: `app/onboarding/page.test.tsx`, `app/settings/page.test.tsx`
- **Mock 경계**: `@shared/api/supabase/viewer`(`fetchViewer`), `@widgets/project-detail`(`fetchProjectDetail`), `next/navigation`(`redirect`, `notFound`), `@features/edit-project`(EditForm — 스텁), `@widgets/header`/`footer`(스텁)
- **Cases**:
  - viewer === null → `redirect("/login")` 호출, fetchProjectDetail 미호출
  - viewer 있고 project === null → `notFound()` 호출
  - viewer 있고 project.user_id !== viewer.id → `notFound()` 호출 (least-info)
  - viewer 있고 owner 일치 → 렌더 성공, EditForm에 `initial.projectId`, `title`, `imagePaths` 등 전달 확인
- **Verify**: `bun run test:unit app/projects` PASS
- **Commit**: `test(app): cover owner-only gate on project edit page`

## Dependency Order

실행 순서: **1 → 2 → 3 → 4 → 6** (Task 5 스킵 확정). 모두 독립적이라 어떤 순서든 가능하나, 위 순서로 진행.

## Success Criteria

- `bun run test:unit` 전체 통과 (현재 ~410 → 약 +30 케이스)
- `bun run typecheck` 통과
- `git status` clean, 추가 파일은 6 신규(또는 5) + 1 삭제
- `e2e/fixtures/`에 `test-screenshot.png` 없음

## Pre-Build Review Gate

다음 두 가지를 확정한 뒤 빌드 단계로 넘어간다:
1. **Task 5 진행 여부** — skip vs. include
2. **각 Task의 케이스 목록** — 위에 적은 분기가 충분한지, 빠진 분기가 있는지

## Out-of-Plan Followups (별도 브랜치)

본 워크트리 범위 밖이지만 후속으로 추적할 가치 있는 항목:
- `features/auth-login/api/actions.ts`, `features/leave-comment/api/actions.ts`, `features/edit-comment/api/actions.ts` — server action 미커버 (UI만 있음)
- `features/cohort-filter/api/fetch-cohorts.ts`, `widgets/comment-list/api/queries.ts`, `widgets/project-detail/api/queries.ts` — server fetch 미커버
- `app/login/page.tsx`, `app/projects/[id]/page.tsx`, `app/projects/new/page.tsx`, `app/projects/[id]/opengraph-image.tsx` — app router pages 미커버
- 커버리지 thresholds + GitHub Actions CI 게이트
