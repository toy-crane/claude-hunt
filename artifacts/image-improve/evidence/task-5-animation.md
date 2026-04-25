# Task 5 — Animation Feel (Human Review)

**Recorded**: 2026-04-26 (localhost:3000, viewport 1456×820)

**Artifact**: `task-5-animation.gif` (4 frames, 171KB)

**Sequence captured**:
1. 초기 상태 (마우스가 빈 영역에 있음)
2. Focus Timer 썸네일 위로 호버 → 1초 대기 (팝오버 떠 있는 상태)
3. 마우스를 빈 영역으로 이동 → 0.5초 대기 (팝오버 닫힘)
4. 닫힌 상태

**Limitation**: Browser MCP gif_creator는 명시적 액션 사이의 정적 프레임만 캡처해 4프레임으로 압축됨. 트랜지션 곡선(220ms ease-out 등장 / 150ms ease-in 닫힘) 자체의 미세한 진행은 GIF에 포함되지 않음. 실제 애니메이션 느낌은 라이브 dev 서버에서 직접 호버해야 정확히 평가 가능.

**Reviewer (사용자 toy-crane) 가 라이브에서 확인할 항목**:
- [ ] 호버 → 등장이 부드럽게 보임 (확확 뜨지 않음)
- [ ] unhover → 사라짐이 자연스러움 (튐 없음)
- [ ] 행을 빠르게 옮겨다닐 때 깜빡이지 않음 (open/close delay가 노이즈 흡수)

**Status**: Pending — 라이브 환경 확인 후 OK/NG 회신 필요.

## Open Question (Task 4에서 surface)

팝오버가 같은 행의 NAME 컬럼과 아래 행들 일부를 시각적으로 덮음. spec의 "다른 컬럼 가리지 않는다" 항목과 충돌.
- 옵션 A: 수용 (호버카드 표준 동작)
- 옵션 B: `side="bottom"` 으로 재배치 (자기 행 보존, 다음 행 덮음)
- 옵션 C: 팝오버 폭 축소 (현재 320 → 더 작게)
