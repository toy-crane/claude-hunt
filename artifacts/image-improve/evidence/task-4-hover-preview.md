# Task 4 — Visual Smoke (Browser MCP)

**Captured**: 2026-04-26 (localhost:3000, viewport 1456×821)

**Method**: Browser MCP `find` → `hover` (ref_33: Focus Timer 썸네일 링크) → `wait 1s` → `screenshot`.

## Observed

- 썸네일을 호버하고 약 1초 뒤 팝오버가 등장함. openDelay + 트랜지션 정상 동작.
- 팝오버는 트리거 우측에 떠올랐으며 표시 콘텐츠는 `Focus Timer` 스크린샷의 확대 이미지(원본 데이터의 오렌지 그라데이션 + 'Focus Timer' 텍스트). `screenshotUrl`이 트리거와 동일하게 전달되는 것이 시각적으로 확인됨.
- Plan 명시 사이즈는 320×200(px). 캡처에서는 트리거(64×40) 우측 12px 오프셋 위치에 같은 비율의 팝오버가 떠올라 위치/사이즈 모두 의도대로 동작.
- 빈 스크린샷 행은 시드 데이터에 없어 본 항목은 N/A. 동일 조건은 unit test `does not render a popover when the project has no screenshot`로 갈음.

## Deviation from Acceptance

> **Acceptance**: "우측에 320px 폭 팝오버가 등장하고 우측 컬럼(이름·작성자·투표 버튼)을 가리지 않는다."

- **Status**: Partial — 팝오버가 행 1의 NAME 컬럼(이름·태그라인) 일부와 그 아래 행 2·3 영역을 시각적으로 덮음.
- **Why**: 트리거(썸네일 우측 끝 ~x=370)에서 12px 오프셋 후 320px 폭으로 펼쳐지면 ~x=702까지 도달. 동일 행의 NAME 컬럼은 ~x=390 근처에서 시작하므로 구조상 겹침이 불가피.
- **이는 호버카드의 일반적 동작**: 팝오버가 콘텐츠 위에 떠오르는 것은 의도된 floating 패턴. GitHub 등 동종 UI도 마찬가지.

## Implication

Spec scenario 1 SC "다른 컬럼을 가리지 않는다"는 현재 레이아웃에서 엄격히 충족되지 않음. 이는 두 갈래로 정리 가능:
1. **수용** — 팝오버 겹침은 호버카드 패턴의 자연스러운 비용. 사용자는 호버 중인 행에 시각적 초점이 있고 텍스트는 이미 인지된 상태.
2. **재배치** — `side="bottom"`으로 변경 시 자기 행은 보존하지만 다음 행을 덮음. `side="left"`는 좌측 RANK 컬럼 좁아 어색함.

판단은 Task 5 디자인 리뷰에서 사용자에게 일임.
