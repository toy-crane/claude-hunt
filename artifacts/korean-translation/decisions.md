# Korean Translation — Execution Decisions

## Reviewer selection: ui-quality-reviewer + wireframe-reviewer + react-reviewer

**When**: Step 2
**Decision**: 최종 단계에서 `wireframe-reviewer` (Task 1 추천 버튼이 wireframe Option C 와 일치하는지), `ui-quality-reviewer` (전체 한국어 UI 시각 품질), `react-reviewer` (Next.js/React 패턴) 세 reviewer를 병렬 실행. `design-reviewer`는 전용 디자인 토큰 변경이 없어 (text-primary 그대로) 생략.
**Why**: feature가 (a) wireframe-driven UI 변경 1건(Task 1), (b) 다수 페이지 텍스트 교체 + 메타데이터, (c) 모두 React/Next.js. 디자인 시스템 위배 가능성 낮음(shadcn variant 그대로 사용).
**Harness Signal**: plan.md 의 "Architecture Decisions" 표가 reviewer 선택의 근거 신호로 쓰이면 좋음. 예: "토큰 변경 없음" → `design-reviewer` 생략 자동 추천.
**Result**: Pending

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
**Result**: Pending

## Browser MCP 스크린샷을 마지막 batch로 미룸

**When**: Step 4 (Task 1 진행 중)
**Decision**: 각 Task 실행 시 Browser MCP 스크린샷을 즉시 찍는 대신, 코드 변경을 모두 끝낸 뒤 마지막 verification 단계에서 한 번에 dev server 띄워서 일괄 처리.
**Why**: dev server 기동 비용 + tab 컨텍스트 비용이 Task 마다 반복되면 비효율. 단위 테스트가 acceptance bullet의 대부분(텍스트 부재, aria-label, 클릭 동작)을 이미 검증하므로 MCP는 시각 확인 보강 용도.
**Harness Signal**: plan.md 의 Verification 블록이 "per-Task MCP" 와 "batched MCP" 를 구분할 수 있는 모드를 가지면 좋음. UI-heavy 프로젝트 vs 텍스트 교체 프로젝트에서 비용 차이가 큼.
**Result**: Pending
