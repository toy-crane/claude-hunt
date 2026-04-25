# image-improve Implementation Plan

## Context

프로젝트 보드 데스크톱 리스트는 64×40 썸네일에 흰 배경 스크린샷이 많아 식별이 어려운 상태였다. 행 정보 밀도(터미널 미감)는 유지하면서 식별성만 보강하기 위해, 썸네일에 호버 시 320×200 미리보기가 우측에 떠오르는 인터랙션을 도입한다. 프로토타입은 이미 `widgets/project-grid/ui/project-card.tsx`에 구현되어 있으며, 본 플랜의 잔여 작업은 spec의 Success Criteria를 테스트로 증명하고 시각적/디자인 품질을 검증하는 것이다.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| 호버 팝오버 컴포넌트 | shadcn HoverCard (radix) | 키보드 포커스 자동 지원, portal 렌더, 성숙한 애니메이션 프리미티브 |
| 트리거 패턴 | 기존 `<a>`를 `HoverCardTrigger asChild`로 감쌈 | 기존 `target="_blank"` 클릭 내비게이션 유지, 링크 포커스 시 팝오버 자동 오픈 |
| 팝오버 위치 | `side="right"`, `align="start"`, `sideOffset={12}` | 행의 다른 컬럼(이름/작성자/투표)을 가리지 않고 썸네일 우측에 펼침 |
| 팝오버 크기 | 320×200 (썸네일의 5배) | 디자인 토의 결과 — 의미 있게 크지만 모달처럼 페이지를 압도하지 않음 |
| 오픈 딜레이 | 150ms | 마우스 스쳐 지나가는 노이즈 방지 |
| 클로즈 딜레이 | 150ms | 우발적 leave / 트리거→콘텐츠 이동에 대한 grace period |
| 트랜지션 | 열림 220ms ease-out / 닫힘 150ms ease-in, zoom 97% → 100% | 비대칭 ease가 자연스러운 등장·퇴장; 살짝의 줌은 팝-인 방지 |
| 스코프 | 데스크톱(≥720px)만 | 모바일은 이미 풀폭 썸네일, 터치에는 호버 개념 없음 |
| reduced-motion 처리 | 별도 처리 없음 | spec에서 명시적 제외 — 사용자 피드백 후 재검토 |
| 스타일 적용 위치 | 인스턴스 className에서 `cn`(tailwind-merge)로 오버라이드 | shadcn 소스(`shared/ui/hover-card.tsx`)는 미수정 → 다른 HoverCard 사용처 영향 없음 |

## Infrastructure Resources

None.

## Data Model

변경 없음. 기존 `ProjectWithVoteCount`의 `screenshot_path`, `project_url`만 사용.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | Tasks 1-3 | 각 Acceptance bullet ↔ 테스트 1:1 매핑, RED → GREEN 규율 |
| shadcn | (참고) | HoverCard 인스턴스 className 오버라이드가 shadcn-guard 규칙(소스 미수정) 안에서 이뤄졌는지 점검 |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `widgets/project-grid/ui/project-card.tsx` | Modify (프로토타입 완료) | — |
| `widgets/project-grid/ui/project-card.test.tsx` | Modify | Tasks 1, 2, 3 |
| `shared/ui/hover-card.tsx` | New (shadcn add 완료) | — |
| `package.json`, `bun.lock` | Modify (radix-ui 의존성 추가 완료) | — |
| `artifacts/image-improve/evidence/` | New | Tasks 4, 5 |

## Tasks

### Task 1: 호버·포커스로 미리보기가 열림을 검증

- **Covers**: Scenario 1 (full — visual smoothness만 Task 5로 위임), Scenario 4 (full)
- **Size**: S (1 file)
- **Dependencies**: None
- **References**:
  - test-driven-development — RED-first, 1:1 mapping; `vi.useFakeTimers()` + userEvent v14의 `advanceTimers` 옵션 활용
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.test.tsx` (수정 — describe 블록 추가)
- **Acceptance**:
  - [x] 데스크톱 썸네일에 `userEvent.hover` 후 `findByTestId("project-card-preview-popover")`가 DOM에 등장한다
  - [x] 팝오버 안 이미지의 `data-src`(next/image 모킹의 src 노출 속성)가 트리거 썸네일의 `data-src`와 동일하다
  - [x] **openDelay 계약 검증**: hover 직후 동기 체크에서 팝오버가 부재하고, 잠시 후 `findByTestId`로 등장이 확인된다 (openDelay=0 또는 제거 시 동기 체크가 실패; 정밀 시점 검증은 React 19 microtask 호환성 문제로 동기/비동기 페어 패턴으로 단순화 — decisions.md 참조)
  - [x] `fireEvent.focus`로 트리거 링크에 포커스를 주면 동일하게 팝오버가 등장한다
  - [x] 다른 요소로 포커스가 이동하면 팝오버가 사라진다
- **Verification**:
  - `bun run test:unit -- project-card`

---

### Task 2: 마우스 이탈 시 닫힘 + grace period 검증

- **Covers**: Scenario 2 (full)
- **Size**: S (1 file)
- **Dependencies**: Task 1 (동일 파일에 후속 케이스 추가)
- **References**:
  - test-driven-development — fake timers 운용
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.test.tsx` (수정)
- **Acceptance**:
  - [ ] 호버 → unhover 직후 100ms 시점에는 팝오버가 여전히 존재한다 (fake timer로 시간 전진)
  - [ ] unhover 후 250ms 경과하면 팝오버가 DOM에서 사라진다
  - [ ] 트리거에서 팝오버 콘텐츠로 마우스를 이동(unhover trigger → hover content)해도 팝오버가 닫히지 않는다
- **Verification**:
  - `bun run test:unit -- project-card`

---

### Task 3: 빈 스크린샷 + 클릭 내비게이션 보존 검증

- **Covers**: Scenario 3 (full), Scenario 5 (full), Invariant "클릭 내비게이션 우선"
- **Size**: S (1 file)
- **Dependencies**: Task 1
- **References**:
  - test-driven-development
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.test.tsx` (수정)
- **Acceptance**:
  - [ ] `screenshotUrl=""`로 렌더하면, 호버 후에도 `project-card-preview-popover` testid가 결코 DOM에 등장하지 않는다 (waitFor + 충분한 timeout)
  - [ ] 빈 썸네일 트리거 `<a>` 요소는 여전히 `href={project_url}`과 `target="_blank"`을 가진다
  - [ ] **팝오버가 열린 상태에서도** 트리거 `<a>`의 `href={project_url}`과 `target="_blank"`이 유지된다 (호버 후 팝오버 표시 → 트리거 링크 속성 재검증) — Scenario 5의 신규 조건. 기존 `opens the project URL in new tabs from every link` 테스트(line 118)는 정적 상태만 검증하므로 보완임
- **Verification**:
  - `bun run test:unit -- project-card`

---

### Checkpoint: After Tasks 1-3

- [ ] 모든 단위 테스트 통과: `bun run test:unit`
- [ ] 빌드 성공: `bun run build`
- [ ] **Invariant "모바일(<720px) 영향 없음" 회귀 확인**: `widgets/project-grid/ui/project-card.test.tsx`의 `describe("ProjectCard (terminal row) — mobile stacked card (< 720 px)")` 블록(line 239–420)이 변경 없이 모두 통과해야 한다 (모바일 카드의 마크업/visibility/typography에 영향 없음을 증명)

---

### Task 4: 시각 스모크 — 실제 브라우저에서 호버 시 미리보기 확인

- **Covers**: Scenario 1 (visual confirmation), Invariant "다른 컬럼 가리지 않음"
- **Size**: S
- **Dependencies**: Checkpoint 1-3
- **References**:
  - Browser MCP — `mcp__claude-in-chrome__navigate`, `mcp__claude-in-chrome__computer` (호버), `mcp__claude-in-chrome__gif_creator`
- **Implementation targets**:
  - `artifacts/image-improve/evidence/task-4-hover-preview.png` (스크린샷)
- **Acceptance**:
  - [ ] 로컬 dev (`http://localhost:3000`)의 프로젝트 보드에서 첫 행 썸네일 호버 시, 우측에 320px 폭 팝오버가 등장하고 우측 컬럼(이름·작성자·투표 버튼)을 가리지 않는다
  - [ ] 빈 스크린샷 행을 호버해도 팝오버가 등장하지 않는다 (시드 데이터에 빈 스크린샷 행이 없으면 본 항목은 N/A로 표기하고 spec scenario 3은 unit test 결과로 갈음)
- **Verification**:
  - Browser MCP로 페이지 진입 → 호버 → 스크린샷 캡처 → `artifacts/image-improve/evidence/`에 저장

---

### Task 5: 디자인 휴먼 리뷰 — 애니메이션 느낌

- **Covers**: Scenario 1 (partial — animation feel만; 자동화 가능한 등장/포커스/지연은 Task 1, 시각 위치는 Task 4)
- **Size**: S
- **Dependencies**: Task 4 (실제 브라우저 동작 가능 상태)
- **References**: 없음 (디자인 판단)
- **Implementation targets**:
  - `artifacts/image-improve/evidence/task-5-animation.gif` 또는 `.mov` (브라우저 MCP gif_creator 또는 OS 화면 녹화)
- **Acceptance**:
  - [ ] 호버 → 등장이 부드럽게 보임 (확확 뜨지 않음)
  - [ ] unhover → 사라짐이 자연스러움 (튐 없음)
  - [ ] 행을 빠르게 옮겨다닐 때 깜빡이지 않음 (open/close delay가 노이즈 흡수)
- **Verification**:
  - Reviewer: 사용자(toy-crane) — 디자인 판단
  - Artifact: `artifacts/image-improve/evidence/task-5-animation.gif` (호버 → 머무름 → 이탈을 한 번에 캡처)
  - Criterion: 위 3개 Acceptance bullet에 대해 OK/NG 코멘트를 남김

---

## Undecided Items

없음.
