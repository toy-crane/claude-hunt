# Korean Translation Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| 번역 방식 | 인라인 문자열 치환 (i18n 라이브러리 없음) | spec에서 단일 언어 운영 명시. `next-intl`/`react-i18next` 도입 비용·번들 부담 회피 |
| 추천 버튼 컬러 토큰 | 기존 `text-primary` 그대로 사용 | spec Design Decisions의 "옵션 C — 미니멀" 정신과 일치. `--success` 토큰 신설은 별도 PR로 분리 |
| 추천 버튼 아이콘 | `RiArrowUpLine` / `RiArrowUpFill` (`@remixicon/react`) | 기존이 같은 라이브러리 사용 중. 위(↑) 방향이 명확한 아이콘. 추가 의존성 없음 |
| 푸터 처리 | 변경하지 않음 | spec assumption: "GitHub", "Feedback", "Built by toycrane", "© 2026 claude-hunt" 모두 영어 유지 항목 |
| 톤 통일 | "~해 주세요", "~했어요", "~할 수 없어요" 등 해요체 일관 적용 | spec Invariant — 합쇼체/반말 금지 |
| 외래어 한글 표기 사전 | 프로젝트, 프로필, 이메일, 라이트/다크/시스템, 태그라인, 스크린샷 | spec Invariant — 모든 화면에서 동일 표기 사용 |

## Infrastructure Resources

None.

## Data Model

변경 없음. 사용자 생성 콘텐츠 스키마(`projects`, `profiles`, `cohorts`, `votes`)는 그대로.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | 모든 Task | RED → GREEN, 각 Acceptance bullet ↔ 테스트 1:1 매핑 |
| frontend-ui-engineering | Tasks 1-11 | UI 컴포넌트·접근성 패턴 |
| shadcn | Task 1 | Button variant 사용 규칙 (커스텀 className 금지, 새 variant 추가 안 함) |
| next-best-practices | Tasks 2, 4, 5, 10 | App Router metadata 패턴, server component vs client component |
| web-design-guidelines | Task 1 | aria-label, 스크린리더 접근성 |
| fsd | 모든 Task | Slice 공개 API(`index.ts`) 경로 유지, 슬라이스 간 import 금지 |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `features/toggle-vote/ui/vote-button.tsx` | Modify | Task 1 |
| `features/toggle-vote/ui/vote-button.test.tsx` | New | Task 1 |
| `app/layout.tsx` | Modify | Task 2 |
| `app/layout.test.tsx` | New | Task 2 |
| `widgets/header/ui/header.tsx` | Modify | Task 3 |
| `widgets/header/ui/header.test.tsx` | New | Task 3 |
| `widgets/header/ui/header-menu.tsx` | Modify | Task 3 |
| `widgets/header/ui/header-menu.test.tsx` | New | Task 3 |
| `app/page.tsx` | Modify | Task 4a |
| `app/page.test.tsx` | New | Task 4a |
| `app/_components/project-board.tsx` | Modify | Task 4a |
| `app/_components/project-board.test.tsx` | New | Task 4a |
| `widgets/project-grid/ui/empty-state.tsx` | Modify | Task 4a |
| `widgets/project-grid/ui/empty-state.test.tsx` | New | Task 4a |
| `widgets/project-grid/ui/project-card.tsx` | Modify | Task 4b |
| `widgets/project-grid/ui/project-card.test.tsx` | New | Task 4b |
| `features/cohort-filter/ui/cohort-dropdown.tsx` | Modify | Task 4b |
| `features/cohort-filter/ui/cohort-dropdown.test.tsx` | New | Task 4b |
| `features/auth-login/ui/login-form.tsx` | Modify | Task 5 |
| `features/auth-login/ui/login-form.test.tsx` | Modify (assert Korean) | Task 5 |
| `app/auth/auth-code-error/page.tsx` | Modify | Task 5 |
| `app/auth/auth-code-error/page.test.tsx` | New | Task 5 |
| `features/onboarding/ui/onboarding-form.tsx` | Modify | Task 6 |
| `features/onboarding/ui/onboarding-form.test.tsx` | Modify (assert Korean) | Task 6 |
| `features/onboarding/api/schema.ts` | Modify (Zod 메시지) | Task 6 |
| `features/submit-project/ui/submit-dialog.tsx` | Modify | Task 7 |
| `features/submit-project/ui/submit-dialog.test.tsx` | Modify | Task 7 |
| `features/submit-project/ui/submit-form.tsx` | Modify | Task 7 |
| `features/submit-project/ui/submit-form.test.tsx` | Modify | Task 7 |
| `features/submit-project/api/schema.ts` | Modify | Task 7 |
| `features/edit-project/ui/edit-dialog.tsx` | Modify | Task 8 |
| `features/edit-project/ui/edit-dialog.test.tsx` | Modify | Task 8 |
| `features/edit-project/api/schema.ts` | Modify | Task 8 |
| `features/delete-project/ui/delete-button.tsx` | Modify | Task 9 |
| `features/delete-project/ui/delete-button.test.tsx` | Modify | Task 9 |
| `app/settings/page.tsx` | Modify | Task 10 |
| `app/settings/page.test.tsx` | New | Task 10 |
| `features/settings/ui/settings-form.tsx` | Modify | Task 10 |
| `features/settings/ui/settings-form.test.tsx` | Modify | Task 10 |
| `shared/lib/display-name-violation.ts` | Modify | Task 10 |
| `features/withdraw-user/ui/withdraw-dialog.tsx` | Modify | Task 11 |
| `features/withdraw-user/ui/withdraw-dialog.test.tsx` | Modify | Task 11 |

## Tasks

### Task 1: 추천 버튼을 아이콘 단독 + 한국어 aria-label 로 재구성

- **Covers**: Scenario 4 (full), Scenario 5 (vote-button 부분 — login 페이지 한국어화는 Task 5)
- **Size**: S (1 파일 + 테스트)
- **Dependencies**: None
- **References**:
  - shadcn — Button variant, do-not-modify components/ui rule
  - web-design-guidelines — icon-only button accessibility, aria-label
  - frontend-ui-engineering — optimistic update 패턴 유지
- **Implementation targets**:
  - `features/toggle-vote/ui/vote-button.tsx` (텍스트 라벨 제거, ThumbsUp → ArrowUp, aria-label "추천하기" 추가, 비로그인 분기에서 "Sign in to vote" 텍스트 제거)
  - `features/toggle-vote/ui/vote-button.test.tsx` (신규, 콜로케이트)
- **Acceptance**:
  - [ ] 로그인 + 미추천 상태 렌더링 시 버튼 내부에 텍스트가 없다 (카운트 숫자 제외) — DOM 텍스트에 "Upvote", "Vote", "추천", "투표" 미존재
  - [ ] 로그인 + 추천 상태에서 버튼에 `border-primary text-primary` 클래스가 적용된다 (활성 컬러)
  - [ ] 비로그인 상태 렌더링 시 "Sign in to vote" 텍스트가 DOM 어디에도 없다
  - [ ] 비로그인 상태에서 버튼이 `<a href="/login">` 으로 렌더링된다
  - [ ] 모든 상태에서 버튼의 `aria-label` 속성이 "추천하기" 이다
  - [ ] 로그인 + 미추천 상태에서 클릭 시 카운트가 1 증가하고 `aria-pressed="true"` 가 된다 (낙관적 업데이트)
  - [ ] 아이콘이 위(↑) 방향을 가리키는 ArrowUp 계열이다 (`RiArrowUpLine` 또는 `RiArrowUpFill` SVG 존재)
- **Verification**:
  - `bun run test:unit -- features/toggle-vote/ui/vote-button.test.tsx` — 위 7개 Acceptance를 단일 파일에서 검증
  - `bun run build` — 타입·번들 무결성
  - Browser MCP — `mcp__claude-in-chrome__navigate` 로 `/` 진입 → `mcp__claude-in-chrome__find` 로 카드 내 추천 버튼 시각 확인 → 스크린샷을 `artifacts/korean-translation/evidence/task-1-vote-button.png` 저장

---

### Task 2: 루트 layout 메타데이터를 한국어로 변경

- **Covers**: Scenario 6 (full)
- **Size**: S (1 파일 + 테스트)
- **Dependencies**: None
- **References**:
  - next-best-practices — `metadata` export, title template, OG tags
- **Implementation targets**:
  - `app/layout.tsx` (`metadata` 객체 한국어화 — title template, description, keywords, OG title/description)
  - `app/layout.test.tsx` (신규)
- **Acceptance**:
  - [ ] `metadata.title` 의 default 또는 template 에 "claude-hunt" 브랜드명이 영어로 보존되면서 한국어 컨텍스트가 적용된다 (예: template `"%s · claude-hunt"`)
  - [ ] `metadata.description` 이 "함께 배우는 사람들의 프로젝트" 이다
  - [ ] `metadata.openGraph.title` 과 `metadata.openGraph.description` 이 한국어이다
  - [ ] description 에 "Discover", "cohort", "showcase" 등 영문 카피가 포함되지 않는다 (단 "claude-hunt" 브랜드명 자체는 허용)
- **Verification**:
  - `bun run test:unit -- app/layout.test.tsx` — `metadata` 객체를 import 하여 문자열 검증
  - `bun run build`

---

### Task 3: 헤더와 사용자 메뉴를 한국어로 변경

- **Covers**: Scenario 1 (헤더 부분)
- **Size**: S (2 파일 + 테스트 2개)
- **Dependencies**: None
- **References**:
  - shadcn — DropdownMenu 사용 규칙
  - frontend-ui-engineering — aria-label 한국어화
- **Implementation targets**:
  - `widgets/header/ui/header.tsx` ("Log in" → "로그인")
  - `widgets/header/ui/header.test.tsx` (신규)
  - `widgets/header/ui/header-menu.tsx` ("Open account menu", "Account", "Theme", "Light", "Dark", "System", "Settings", "Log out" → 한국어)
  - `widgets/header/ui/header-menu.test.tsx` (신규)
- **Acceptance**:
  - [ ] 비로그인 상태 헤더에 "로그인" 버튼이 표시되고 "Log in" 영문이 DOM 에 없다
  - [ ] 사용자 메뉴 트리거의 `aria-label` 이 한국어이다 (예: "계정 메뉴 열기")
  - [ ] 메뉴 열림 시 항목이 "테마", "라이트", "다크", "시스템", "설정", "로그아웃" 으로 표시된다
  - [ ] 메뉴 영역에서 "Theme", "Light", "Dark", "System", "Settings", "Log out", "Account" 영문이 DOM 에 없다
- **Verification**:
  - `bun run test:unit -- widgets/header/ui/` — 두 테스트 파일 동시 실행
  - `bun run build`
  - Browser MCP — `/` 에서 헤더 시각 확인, 사용자 메뉴 열림 상태 스크린샷을 `artifacts/korean-translation/evidence/task-3-header.png` 저장

---

### Checkpoint: After Tasks 1-3
- [ ] `bun run test` 전체 통과
- [ ] `bun run build` 성공
- [ ] 홈 진입 시 헤더가 한국어로 보이고, 추천 버튼이 아이콘 단독으로 동작한다 (메인 본문은 아직 영어)

---

### Task 4a: 홈 페이지 헤딩·서브헤딩·빈 상태·project-board 래퍼를 한국어로 변경

- **Covers**: Scenario 1 (헤딩/서브헤딩/빈 상태/필터 aria-label 부분)
- **Size**: M (3 파일 + 테스트 3개)
- **Dependencies**: Task 3 (헤더가 한국어여야 홈 전체 한국어 검증 가능)
- **References**:
  - next-best-practices — server component 기본, 클라이언트 경계 최소화
  - frontend-ui-engineering — empty state 패턴
- **Implementation targets**:
  - `app/page.tsx` (헤딩 "프로젝트 보드", 서브헤딩 "좋아하는 프로젝트에 응원을 보내주세요.", "Submit a project" 버튼 라벨)
  - `app/page.test.tsx` (신규)
  - `app/_components/project-board.tsx` ("Filter by cohort" aria-label 한국어)
  - `app/_components/project-board.test.tsx` (신규 — 한국어 aria-label 노출 검증)
  - `widgets/project-grid/ui/empty-state.tsx` ("아직 프로젝트가 없어요", "첫 프로젝트를 제출해 보세요." 형태)
  - `widgets/project-grid/ui/empty-state.test.tsx` (신규)
- **Acceptance**:
  - [ ] 홈 페이지 헤딩에 "프로젝트 보드" 텍스트가 표시된다
  - [ ] 홈 페이지 서브헤딩에 "좋아하는 프로젝트에 응원을 보내주세요." 가 표시된다
  - [ ] "Submit a project" 버튼 라벨이 한국어로 표시된다 (예: "프로젝트 제출")
  - [ ] 프로젝트가 0건일 때 "아직 프로젝트가 없어요" 형태의 한국어 빈 상태 메시지가 표시된다
  - [ ] project-board 래퍼의 `aria-label` 또는 시각적 라벨이 한국어이다 ("Filter by cohort" 영문 미존재)
- **Verification**:
  - `bun run test:unit -- app/page.test.tsx app/_components/project-board.test.tsx widgets/project-grid/ui/empty-state.test.tsx` — 3개 테스트 파일 실행
  - `bun run build`
  - Browser MCP — `/` 진입 → 빈 상태 스크린샷 `artifacts/korean-translation/evidence/task-4a-home-empty.png` 저장

---

### Task 4b: 프로젝트 카드 표시 + 코호트 필터를 한국어로 변경

- **Covers**: Scenario 1 (카드/필터 부분)
- **Size**: M (2 파일 + 테스트 2개)
- **Dependencies**: Task 4a (홈 페이지 chrome 기준 정렬)
- **References**:
  - shadcn — Select/DropdownMenu 사용 규칙
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.tsx` ("by" 그대로 또는 "·" 구분자, "Anonymous" → "익명", alt "Project screenshot" → "프로젝트 스크린샷")
  - `widgets/project-grid/ui/project-card.test.tsx` (신규)
  - `features/cohort-filter/ui/cohort-dropdown.tsx` ("Filter by cohort" → "기수로 필터", "All cohorts" → "모든 기수")
  - `features/cohort-filter/ui/cohort-dropdown.test.tsx` (신규)
- **Acceptance**:
  - [ ] 프로젝트 카드의 작성자 fallback 이 "익명" 이다
  - [ ] 카드 이미지의 alt 텍스트가 "프로젝트 스크린샷" (또는 동일 의미) 이다
  - [ ] 코호트 필터 드롭다운의 기본 옵션이 "모든 기수" 이다
  - [ ] 코호트 필터 트리거의 `aria-label` 이 "기수로 필터" 형태의 한국어이다
  - [ ] 홈 페이지 전체 DOM 에 "Project Board", "Cohort", "Discover", "Submit a project", "All cohorts", "Filter by cohort", "Anonymous", "Project screenshot" 영문이 한 건도 없다 (Task 4a 와 결합 후 종합 검증)
- **Verification**:
  - `bun run test:unit -- widgets/project-grid/ui/project-card.test.tsx features/cohort-filter/ui/cohort-dropdown.test.tsx`
  - `bun run build`
  - Browser MCP — `/` 진입 → 프로젝트 카드 + 필터 열림 스크린샷 `artifacts/korean-translation/evidence/task-4b-cards-filter.png` 저장. 페이지 텍스트 검색으로 위 영문 8개 모두 미존재 확인

---

### Task 5: 로그인 페이지와 인증 에러 페이지를 한국어로 변경

- **Covers**: Scenario 5 (login 페이지 부분)
- **Size**: S (2 파일 + 테스트 2개)
- **Dependencies**: None
- **References**:
  - frontend-ui-engineering — form label/placeholder 패턴
- **Implementation targets**:
  - `features/auth-login/ui/login-form.tsx` (제목, 설명, "Or continue with", magic link 안내, 약관 문구 등 한국어. "GitHub", "Google" 버튼 라벨은 영어 유지)
  - `features/auth-login/ui/login-form.test.tsx` (기존 테스트의 영문 assertion 을 한국어로 갱신)
  - `app/auth/auth-code-error/page.tsx` ("Authentication Error", "Something went wrong during sign-in. Please try again.", "Back to login" 한국어)
  - `app/auth/auth-code-error/page.test.tsx` (신규)
- **Acceptance**:
  - [ ] 로그인 페이지 제목이 "다시 만나서 반가워요" 형태의 한국어이다
  - [ ] 이메일 필드 라벨이 "이메일", placeholder 는 `you@example.com` 그대로 (이메일 형식 안내용)
  - [ ] 매직 링크 발송 후 "이메일을 확인해 주세요" 형태의 한국어 안내가 표시된다
  - [ ] OAuth 버튼 라벨 "GitHub" 와 "Google" 은 영어 그대로이다
  - [ ] 인증 에러 페이지 헤딩이 "인증 오류" 형태의 한국어이고, "로그인으로 돌아가기" 버튼이 표시된다
  - [ ] 두 페이지 DOM 에 "Welcome back", "Sign in", "Continue", "Authentication Error", "Back to login" 영문이 없다 (단 "GitHub", "Google" 제외)
- **Verification**:
  - `bun run test:unit -- features/auth-login app/auth/auth-code-error`
  - `bun run build`
  - Browser MCP — `/login` 진입 → 폼 전체 스크린샷 + `/auth/auth-code-error` 진입 후 스크린샷, `artifacts/korean-translation/evidence/task-5-{login,auth-error}.png` 저장

---

### Checkpoint: After Tasks 4a, 4b, 5
- [ ] `bun run test` 통과
- [ ] `bun run build` 성공
- [ ] 비로그인 방문자가 홈 → 로그인 페이지로 이동하는 전체 플로우가 한국어로 보인다 (헤딩, 카드, 필터, 빈 상태, 로그인 폼 모두 한국어)

---

### Task 6: 온보딩 폼과 검증 메시지를 한국어로 변경 ("Cohort" → "기수")

- **Covers**: Scenario 3 (full)
- **Size**: S (2 파일 + 테스트)
- **Dependencies**: None
- **References**:
  - frontend-ui-engineering — form validation, Zod 메시지 위치
  - shadcn — Select/Input 컴포넌트 라벨 패턴
- **Implementation targets**:
  - `features/onboarding/ui/onboarding-form.tsx` (제목, 설명, 필드 라벨, dropdown placeholder, "기수 없음" alert, 버튼 모두 한국어)
  - `features/onboarding/ui/onboarding-form.test.tsx` (영문 assertion → 한국어 갱신)
  - `features/onboarding/api/schema.ts` (Zod 메시지: "표시명을 입력해 주세요.", "표시명은 50자 이하로 입력해 주세요.", "기수를 선택해 주세요.")
- **Acceptance**:
  - [ ] 폼 헤딩이 "프로필 설정" 형태의 한국어이다
  - [ ] 표시명 필드 라벨이 "표시명" 이고 placeholder 가 한국어이다
  - [ ] 기수 필드 라벨이 "기수" 이고 dropdown placeholder 가 "기수를 선택하세요" 형태이다
  - [ ] 빈 표시명으로 제출 → "표시명을 입력해 주세요." 형태의 한국어 에러가 필드 아래에 표시된다
  - [ ] 51자 이상 표시명 → "50자 이하" 안내 한국어 에러가 표시된다
  - [ ] 기수 미선택 제출 → "기수를 선택해 주세요." 형태의 한국어 에러가 표시된다
  - [ ] 사용 가능한 기수가 빈 배열일 때 "기수가 아직 없어요. 강사에게 기수 배정을 요청해 주세요." 형태의 한국어 alert 가 표시된다
  - [ ] 페이지 DOM 에 "Cohort", "Display name", "Set up your profile" 등 영문이 없다
- **Verification**:
  - `bun run test:unit -- features/onboarding`
  - `bun run build`
  - Browser MCP — 신규 가입 후 `/onboarding` 진입 → 폼 + 기수 dropdown 열림 + 빈 표시명 제출로 검증 에러 노출 상태 스크린샷, `artifacts/korean-translation/evidence/task-6-onboarding.png` 저장

---

### Task 7: 프로젝트 제출 다이얼로그·폼·스키마를 한국어로 변경

- **Covers**: Scenario 2 (full)
- **Size**: M (3 파일 + 테스트 2개)
- **Dependencies**: None
- **References**:
  - shadcn — Dialog 컴포넌트 사용 규칙
  - frontend-ui-engineering — file upload, Zod URL 검증
- **Implementation targets**:
  - `features/submit-project/ui/submit-dialog.tsx` (제목 "프로젝트 제출", 설명, 토스트 "프로젝트가 제출되었어요." 한국어)
  - `features/submit-project/ui/submit-dialog.test.tsx` (한국어 갱신)
  - `features/submit-project/ui/submit-form.tsx` (필드 라벨 "제목/태그라인/프로젝트 URL/스크린샷", placeholder, 도움말 텍스트, 버튼 한국어. URL placeholder `https://myapp.com` 은 그대로)
  - `features/submit-project/ui/submit-form.test.tsx` (한국어 갱신)
  - `features/submit-project/api/schema.ts` (Zod: "제목을 입력해 주세요.", "제목은 N자 이하로 입력해 주세요.", "태그라인을 입력해 주세요.", "http:// 또는 https:// 로 시작하는 URL을 입력해 주세요.", "스크린샷을 첨부해 주세요.")
- **Acceptance**:
  - [ ] 다이얼로그 제목이 "프로젝트 제출" 이다
  - [ ] 필드 라벨이 "제목", "태그라인", "프로젝트 URL", "스크린샷" 이다
  - [ ] 빈 제목 제출 → 제목 필드 아래에 "제목을 입력해 주세요." 형태의 한국어 에러
  - [ ] `http(s)://` 미시작 URL 입력 → "http:// 또는 https:// 로 시작하는 URL을 입력해 주세요." 형태의 한국어 에러
  - [ ] 정상 제출 후 "프로젝트가 제출되었어요." 형태의 한국어 토스트가 호출된다 (toast 모킹으로 호출 인자 검증)
  - [ ] 다이얼로그 DOM 에 "Submit", "Title", "Tagline", "Project URL", "Screenshot" 영문이 없다
  - [ ] 모든 메시지가 해요체이다 (자동 검증: "~하십시오", "~합니다" 패턴 미포함)
- **Verification**:
  - `bun run test:unit -- features/submit-project`
  - `bun run build`
  - Browser MCP — 로그인 후 `/` 에서 다이얼로그 열어 빈 값 제출 → 한국어 에러 스크린샷 `artifacts/korean-translation/evidence/task-7-submit-validation.png`

---

### Task 8: 프로젝트 수정 다이얼로그·스키마를 한국어로 변경

- **Covers**: Invariant (외래어 표기 일관성, 톤 일관성)
- **Size**: S (2 파일 + 테스트)
- **Dependencies**: Task 7 (Zod 메시지 어휘를 같은 톤으로 정렬)
- **References**:
  - shadcn — Dialog
- **Implementation targets**:
  - `features/edit-project/ui/edit-dialog.tsx` ("프로젝트 수정", 설명, "스크린샷 (선택)", "취소", "변경 사항 저장" 등 한국어)
  - `features/edit-project/ui/edit-dialog.test.tsx` (한국어 갱신)
  - `features/edit-project/api/schema.ts` (Task 7 과 동일한 Zod 메시지 어휘 사용)
- **Acceptance**:
  - [ ] 다이얼로그 제목이 "프로젝트 수정" 이다
  - [ ] 스크린샷 라벨이 "스크린샷 (선택)" 형태이다
  - [ ] 취소/저장 버튼 라벨이 "취소", "변경 사항 저장" (또는 동일 의미) 이다
  - [ ] Zod 검증 메시지가 Task 7 과 동일한 표현을 사용한다 (어휘 일관성: 한 화면은 "입력해 주세요" 다른 화면은 "넣어 주세요" 식 불일치 없음)
  - [ ] 다이얼로그 DOM 에 "Edit", "Save changes", "Cancel" 영문이 없다
- **Verification**:
  - `bun run test:unit -- features/edit-project`
  - `bun run build`

---

### Task 9: 프로젝트 삭제 다이얼로그를 한국어로 변경

- **Covers**: Invariant (외래어/톤 일관성)
- **Size**: S (1 파일 + 테스트)
- **Dependencies**: None
- **References**:
  - shadcn — AlertDialog (위험 액션)
- **Implementation targets**:
  - `features/delete-project/ui/delete-button.tsx` ("프로젝트를 삭제할까요?", 본문, "취소", "삭제" 한국어)
  - `features/delete-project/ui/delete-button.test.tsx` (한국어 갱신)
- **Acceptance**:
  - [ ] 다이얼로그 제목이 "프로젝트를 삭제할까요?" 형태의 한국어이다
  - [ ] 본문에 프로젝트 제목이 인용 부호로 보존되어 표시된다 (예: `"내 앱"을(를) 그리드에서 제거합니다. 되돌릴 수 없어요.`)
  - [ ] 취소/확정 버튼 라벨이 "취소", "삭제" 이다
  - [ ] DOM 에 "Delete project", "Cancel", "This action cannot be undone" 영문이 없다
- **Verification**:
  - `bun run test:unit -- features/delete-project`
  - `bun run build`

---

### Checkpoint: After Tasks 6-9
- [ ] `bun run test` 통과
- [ ] `bun run build` 성공
- [ ] 신규 가입 → 온보딩 → 프로젝트 제출 → 수정 → 삭제 플로우 전체가 한국어로 동작

---

### Task 10: 설정 페이지·폼·공유 검증 메시지를 한국어로 변경

- **Covers**: Scenario 7 (설정 페이지 부분, 위험 영역 라벨)
- **Size**: M (3 파일 + 테스트)
- **Dependencies**: None
- **References**:
  - next-best-practices — page-level metadata
  - frontend-ui-engineering — form
- **Implementation targets**:
  - `app/settings/page.tsx` (페이지 metadata title "설정", "홈으로 돌아가기" 링크, 섹션 헤딩 "프로필", "위험 영역", "계정 삭제" 라벨과 설명)
  - `app/settings/page.test.tsx` (신규 — server component 렌더 + metadata 검증)
  - `features/settings/ui/settings-form.tsx` ("이메일", "표시명", 토스트 "표시명이 변경되었어요.", "저장")
  - `features/settings/ui/settings-form.test.tsx` (한국어 갱신)
  - `shared/lib/display-name-violation.ts` (`DISPLAY_NAME_TAKEN_MESSAGE` 를 "이미 사용 중인 표시명이에요." 형태로 변경)
- **Acceptance**:
  - [ ] 설정 페이지 metadata title 이 "설정" 이다
  - [ ] 페이지 헤딩 "설정", "프로필", "위험 영역" 이 한국어로 표시된다
  - [ ] "홈으로 돌아가기" 링크가 표시된다
  - [ ] "계정 삭제" 라벨과 한국어 설명 ("프로필, 프로젝트, 추천을 영구 삭제합니다. 되돌릴 수 없어요." 형태) 이 표시된다
  - [ ] 표시명 저장 시 "표시명이 변경되었어요." 형태의 한국어 토스트가 호출된다
  - [ ] 중복 표시명 입력 시 `DISPLAY_NAME_TAKEN_MESSAGE` 가 한국어로 표시된다
  - [ ] 페이지 DOM 에 "Settings", "Profile", "Danger Zone", "Display name updated" 영문이 없다 (단 "Email" 라벨은 외래어 표기 "이메일" 사용)
- **Verification**:
  - `bun run test:unit -- app/settings features/settings`
  - `bun run build`
  - Browser MCP — 로그인 후 `/settings` 진입 → 페이지 전체 + 표시명 변경 후 토스트 노출 상태 스크린샷, `artifacts/korean-translation/evidence/task-10-settings.png` 저장

---

### Task 11: 계정 삭제 다이얼로그를 한국어로 변경

- **Covers**: Scenario 7 (full)
- **Size**: S (1 파일 + 테스트)
- **Dependencies**: Task 10 (설정 페이지에서 진입)
- **References**:
  - shadcn — AlertDialog (위험 액션, 확인 입력 패턴)
- **Implementation targets**:
  - `features/withdraw-user/ui/withdraw-dialog.tsx` (제목 "계정 삭제", 4개 항목 한국어 bullet, 확인 프롬프트 "확인을 위해 [이메일]을 입력해 주세요.", 버튼 한국어)
  - `features/withdraw-user/ui/withdraw-dialog.test.tsx` (한국어 갱신)
- **Acceptance**:
  - [ ] 다이얼로그 제목이 "계정 삭제" 이다
  - [ ] "다음 항목이 영구 삭제됩니다:" 형태의 안내 후 4개 bullet 이 한국어로 표시된다 (프로필, 제출한 프로젝트, 추천 기록, 업로드한 스크린샷)
  - [ ] 확인 입력 안내가 "확인을 위해 [이메일]을 입력해 주세요." 형태의 한국어이다 (이메일 값은 동적으로 보존)
  - [ ] 취소/확정 버튼 라벨이 "취소", "계정 삭제" (또는 동일 의미) 이다
  - [ ] DOM 에 "Delete account", "This will permanently remove", "Type" 영문이 없다
- **Verification**:
  - `bun run test:unit -- features/withdraw-user`
  - `bun run build`
  - Browser MCP — 설정 페이지에서 다이얼로그 열어 4개 bullet 가시 상태 스크린샷 `artifacts/korean-translation/evidence/task-11-withdraw.png`

---

### Final Checkpoint: After Tasks 10-11
- [ ] `bun run test` 전체 통과 (Vitest + pgTAP)
- [ ] `bun run build` 성공
- [ ] 전체 사이트를 비로그인 → 로그인 → 온보딩 → 제출 → 수정 → 삭제 → 추천 → 설정 → 계정 삭제 순서로 손수 둘러봐 영문 UI 가 보이지 않는다
- [ ] **Human review (디자인 판단)** — 전체 화면을 둘러보며 (a) 외래어 표기 일관성("프로젝트" vs "Project" 혼용 없음), (b) 톤 일관성(해요체 일관), (c) 추천 버튼 시각적 강조가 충분한지 검토. 검토 결과를 `artifacts/korean-translation/evidence/final-review.md` 에 기록 (검토자: 작업자 본인 + 1인)

---

## Undecided Items

- 추천 버튼 활성 컬러를 별도 `--success` 토큰으로 분리할지 — 본 PR 에서는 기존 `text-primary` 사용. 출시 후 시각 강조가 부족하다는 피드백이 나오면 별도 PR 로 토큰 도입
- 토스트·검증 에러의 어휘 일관성(예: "입력해 주세요" vs "넣어 주세요", "선택해 주세요" vs "골라 주세요") — Task 6/7/8 진행 중 1차 어휘 결정, 이후 Task 9-11 에서 동일 어휘 적용
- "Project Board" 페이지 헤딩 표기 — 본 plan 은 "프로젝트 보드" 로 가정. 만약 헤딩만큼은 영어 유지 선호가 있으면 spec 갱신 후 Task 4 만 재실행
