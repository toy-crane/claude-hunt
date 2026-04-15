# Korean Translation — Execution Decisions

## Reviewer selection: ui-quality-reviewer + wireframe-reviewer + react-reviewer

**When**: Step 2
**Decision**: 최종 단계에서 `wireframe-reviewer` (Task 1 추천 버튼이 wireframe Option C 와 일치하는지), `ui-quality-reviewer` (전체 한국어 UI 시각 품질), `react-reviewer` (Next.js/React 패턴) 세 reviewer를 병렬 실행. `design-reviewer`는 전용 디자인 토큰 변경이 없어 (text-primary 그대로) 생략.
**Why**: feature가 (a) wireframe-driven UI 변경 1건(Task 1), (b) 다수 페이지 텍스트 교체 + 메타데이터, (c) 모두 React/Next.js. 디자인 시스템 위배 가능성 낮음(shadcn variant 그대로 사용).
**Harness Signal**: plan.md 의 "Architecture Decisions" 표가 reviewer 선택의 근거 신호로 쓰이면 좋음. 예: "토큰 변경 없음" → `design-reviewer` 생략 자동 추천.
**Result**: Success — 세 reviewer (wireframe, ui-quality, react) 모두 PASS, 별도 reviewer 가 필요한 missing dimension 발견되지 않음.

## Task execution order: 1 → 2 → 3 → 4a → 4b → 5 → 6 → 7 → 8 → 9 → 10 → 11

**When**: Step 3
**Decision**: plan.md 에 명시된 의존성 그대로 순차 실행. Task 1(vote button)을 가장 먼저 실행해 high-risk 시각 변경을 조기에 검증.
**Why**:
- Task 4a depends on Task 3 (헤더 한국어 후 홈 전체 검증)
- Task 4b depends on Task 4a (홈 chrome 정렬 후 카드/필터)
- Task 8 depends on Task 7 (Zod 어휘 정렬)
- Task 11 depends on Task 10 (설정 진입점)
- 나머지 Task는 독립적이지만 plan 순서를 따라 일관성 유지
**Harness Signal**: Task에 명시된 Dependencies 필드가 위상 정렬에 직접 사용 가능한 형태. 향후 plan-template 에 "depends-on:" YAML 형태로 명시화하면 자동 정렬 가능.
**Result**: Success — 12 Task 모두 dependency 위반 없이 순차 완료, 각 Task 1 commit.

## Browser MCP 스크린샷을 마지막 batch로 미룸

**When**: Step 4 (Task 1 진행 중)
**Decision**: 각 Task 실행 시 Browser MCP 스크린샷을 즉시 찍는 대신, 코드 변경을 모두 끝낸 뒤 마지막 verification 단계에서 한 번에 dev server 띄워서 일괄 처리.
**Why**: dev server 기동 비용 + tab 컨텍스트 비용이 Task 마다 반복되면 비효율. 단위 테스트가 acceptance bullet의 대부분(텍스트 부재, aria-label, 클릭 동작)을 이미 검증하므로 MCP는 시각 확인 보강 용도.
**Harness Signal**: plan.md 의 Verification 블록이 "per-Task MCP" 와 "batched MCP" 를 구분할 수 있는 모드를 가지면 좋음. UI-heavy 프로젝트 vs 텍스트 교체 프로젝트에서 비용 차이가 큼.
**Result**: Success — ui-quality-reviewer 가 자체 MCP로 모든 페이지 시각 검증 수행. evidence/ 디렉토리에 스크린샷 생성됨.

## Reviewer 결과 정리 (Step 5)

**When**: Step 5, evaluation loop
**Decision**: 세 reviewer 모두 PASS. ui-quality-reviewer 의 Warning 2건 중 명백한 spec 위반인 두 가지("by" 영어 잔존, 합쇼체-해요체 혼용)는 즉시 수정 후 commit. 나머지 한 Warning(JetBrains Mono 헤딩 폰트가 한국어 글자 간 공백을 키움)은 브랜드 헤딩 폰트 유지 vs i18n 가독성 trade-off — 본 PR 범위 밖으로 분류, 후속 PR 에서 처리.
**Why**: Warning 정의상 immediate fix 가능한 것은 즉시, 디자인 token/font 변경은 별도 PR 의 영역.
**Harness Signal**: ui-quality-reviewer 의 Warning 을 (a) 즉시 수정 가능, (b) 디자인 결정 필요로 자동 분류해 주면 좋음. 현재는 모두 동일한 "Warning" 으로 묶여 있음.
**Result**: Success — 두 fix 적용 후 전체 테스트 288개 통과, build 성공.

## ui-quality-reviewer Warning: 헤딩 폰트와 한국어 가독성 (deferred)

**When**: Step 5
**Decision**: `app/page.tsx` 의 h1 "프로젝트 보드" 가 `font-heading` (JetBrains Mono) 을 사용해 한국어 글자 간격이 어색하게 넓어 보임. 본 PR 에서는 수정하지 않고 후속 task 로 분리.
**Why**: (1) 브랜드 헤딩 폰트는 의도적 디자인 결정, (2) 폰트 시스템 변경은 i18n PR 의 범위를 벗어남, (3) 본 PR 핵심 목표(한국어화 + 추천 버튼 재디자인)에 영향 없음.
**Harness Signal**: spec 에 "외래어 표기 일관성" 이 있어도 폰트의 CJK 렌더링 품질까지는 명시되지 않음. spec template 에 "타이포그래피/폰트 i18n 적합성" 항목이 있으면 좋음.
**Result**: Pending — 별도 follow-up PR 에서 한국어 헤딩 폰트 또는 word-spacing 보정 도입 검토.
