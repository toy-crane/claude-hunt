# image-improve — Execution Decisions

## Reviewer 선정

**When**: Step 2, Reviewer selection
**Decision**: `ui-quality-reviewer`, `design-reviewer`, `react-reviewer` 3개 채택. `wireframe-reviewer`는 제외.
**Why**:
- `wireframe-reviewer` — 본 feature는 wireframe.html이 없음(소규모 인터랙션 보강이라 sketch 단계 의도적 생략).
- `ui-quality-reviewer` — UI 변경(호버 팝오버) 발생, 시각 품질 자기 검증 필요.
- `design-reviewer` — shadcn HoverCard 인스턴스 className 오버라이드가 `shadcn-guard.md` 규칙(소스 미수정 + className 오버라이드 최소화)과 충돌하지 않는지 점검 필요.
- `react-reviewer` — React 컴포넌트 코드, Next.js Image 사용, view transition import 영향. 성능/패턴 점검 필요.
**Harness Signal**: N/A
**Result**: Pending

---

## Task 실행 순서

**When**: Step 3, Task ordering
**Decision**: plan.md 명시 순서를 그대로 따름 — Task 1 → 2 → 3 → Checkpoint → Task 4 → Task 5.
**Why**: 모든 task가 동일 파일(`project-card.test.tsx`)을 수정하거나 그 후속 검증이라 의존성이 선형. Task 4(visual smoke), Task 5(animation review)는 코드 안정성이 전제되어야 의미가 있음.
**Harness Signal**: N/A
**Result**: Pending

---

## Task 1: openDelay 계약 검증을 fake timer 대신 동기 체크로 단순화

**When**: Step 4, Task 1 실행 — 초기 plan은 `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(100/200)` 으로 100ms 부재 / 200ms 존재를 정밀 검증하도록 명시했음.
**Decision**: fake timer를 포기하고 "hover 직후 동기적으로 부재 → `findByTestId`로 잠시 후 등장"으로 대체. `openDelay`가 0이 되거나 제거되면 동기 체크가 실패하므로 reviewer 의도(회귀 보호)는 그대로 충족.
**Why**:
- Vitest fake timers + Radix HoverCard + React 19의 microtask 배치가 충돌해 `await user.hover(...)` 가 5초 타임아웃까지 hang함.
- `fireEvent.pointerEnter` + `vi.advanceTimersByTimeAsync(200)` 으로 우회해도 React 19의 deferred state update가 즉시 popover를 commit하지 않아 `getByTestId`가 실패.
- 시간 정밀도(150ms 경계)를 고집하면 테스트가 React 내부 스케줄링과 결합돼 깨지기 쉬움. 회귀 보호 목적은 "openDelay > 0" 만 보장하면 충분.
**Harness Signal**: plan-reviewer가 "X ms 시점 정밀 assertion"을 요구하는 패턴은 jsdom + React 19 + Radix 조합에서 자주 비용이 큼. `draft-plan` 스킬 또는 `test-driven-development` 스킬에 "타이밍 정밀도가 spec의 본질이 아니면 동기-부재 + 비동기-존재 패턴을 우선 권장" 가이드를 추가할 만함.
**Result**: Success — 24/24 unit tests pass.

---

## Reviewer 결과 (Step 5)

**When**: Step 5, Evaluation Loop
**Decision**: 3개 reviewer 결과를 다음과 같이 처리:
- **ui-quality-reviewer**: PASS with 3 Warnings.
  - W1 (NAME 컬럼 가림): 사용자 판단 항목으로 surface. Task 4 evidence에서 이미 노출됨.
  - **W2 (높이 320×240, spec=320×200): 즉시 수정.** `h-auto` → `h-[200px]`로 변경해 spec과 일치.
  - W3 (다크모드 팝오버 경계 invisibility): 사용자 판단 항목으로 surface. 추가 className 오버라이드가 필요한데 design-reviewer 우려와 충돌해 자동 수정 보류.
  - 3개 Advisory(border-radius, 캡션, 애니메이션 클래스 충돌)는 Step 6 보고에서 surface.
- **design-reviewer**: FAIL(conditional) — className 오버라이드가 shadcn-guard 4단계(user confirmation) 충족하지만 literal rule엔 위반. Reviewer 권장은 `ProjectScreenshotHoverCardContent` wrapper 추출.
  - **즉시 수정 보류** — 사용자 사전 승인으로 escalation 충족됨. Wrapper 추출은 코드 중복 없는 단일 호출처에 대한 과한 추상화로 판단. follow-up으로 surface.
- **react-reviewer**: PASS — Critical/High 차단 없음. 1 HIGH advisory(render prop boundary)는 본 feature 도입이 아닌 기존 패턴. 2 Medium/Low advisory(테스트 setTimeout 슬립, fireEvent/userEvent 일관성)는 follow-up으로 surface.
**Why**: 명백한 spec 위반(W2 높이)만 즉시 수정. UX 판단(W1 컬럼 가림)과 다크모드 가시성(W3)은 사용자 디자인 의도 영역 — 사용자에게 surface해 다음 라운드 결정으로 미룸. design-reviewer FAIL은 user confirmation으로 이미 승인된 boundary case이므로 wrapper 추출은 follow-up에 양보.
**Harness Signal**: 사용자 prior approval이 shadcn-guard step 4를 충족했는지 명시적으로 인식하는 가이드가 design-reviewer에 추가되면 좋음. 본 사례처럼 "literal violation but conditionally approved"가 흔할 수 있음.
**Result**: Pending → Mixed — W2 즉시 수정 후 30/30 unit tests pass. 나머지는 사용자 판단으로 이전.
