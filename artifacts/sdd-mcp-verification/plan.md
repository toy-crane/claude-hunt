# SDD: Bake Browser MCP into Verification

## Context

`/draft-plan`이 만드는 plan에 브라우저로만 입증 가능한 Acceptance(레이아웃, 스크롤, 라우트별 존재·부재, 실제 렌더링)를 검증할 표준 수단이 없다. 지금은 "Manual: visit X"로 빠지거나 jsdom 단위 테스트로 우회한다.

목적: 4단 검증 체계 — 코드 / Playwright e2e / Browser MCP / 사람 검증 — 를 SDD의 표준으로 박아, 다음 `/draft-plan`부터 자동으로 plan에 반영되게 한다.

범위: 메타-튜닝 (skills 파일만 수정).

## Affected Files

| File | Change |
|------|--------|
| `.claude/skills/draft-plan/references/plan-template.md` | Modify |
| `.claude/skills/draft-plan/SKILL.md` | Modify |

## Tasks

### Task 1: `plan-template.md`의 Verification 예시에 Browser MCP 항목 추가

- **What**: drafter가 plan을 쓸 때 Verification 블록의 모범 형태에 Browser MCP가 한 옵션으로 보이도록 한다. 기존 두 항목(`bun run test:unit`, `bun run build`)은 유지.
- **Acceptance**:
  - [ ] Verification 블록 예시에 "UI 가시 변경 task일 때 Browser MCP 사용" 항목이 한 줄로 추가되어 있다
  - [ ] 기존 항목 두 개는 그대로 유지된다

---

### Task 2: `draft-plan/SKILL.md` "Task Writing Principles"에 `#### Verification` 절 신설

- **What**: Acceptance와 짝을 이루는 일반 룰을 박는다. 핵심 메시지 셋:
  1. **한 Acceptance ↔ 최소 한 검증 명령** — 한 줄도 빠뜨리지 말 것
  2. **검증 가능성 중심**(도구 중심이 아닌) — 도구가 안 맞으면 사람을 명시. 4단 표(코드 / Playwright / Browser MCP / Human review)
  3. **"manual: visit X" 회피 금지** — 단, 자동화 가능한 검증을 회피할 때만. 본질적으로 사람이 봐야 하는 항목은 reviewer/role/방법을 명시하면 합법
- **위치**: Step 6의 Task Writing Principles 안, `#### Acceptance` 다음, `#### Ordering` 이전.
- **Acceptance**:
  - [ ] `#### Verification` 절이 Acceptance와 Ordering 사이에 존재한다
  - [ ] 검증 옵션 4가지가 표로 정리되어 있다 (코드 / Playwright / MCP / Human review)
  - [ ] "manual: visit X 회피 금지" 문구가 자동화 가능한 검증을 회피하는 경우로 한정되어 명시된다
  - [ ] Human review 옵션은 reviewer/artifact/criterion 명시를 요구한다
  - [ ] 본문은 plan-template.md를 형식 참조로 안내한다 (도구 사용법 자체는 반복하지 않음)

---

### ✅ Final Checkpoint — after Tasks 1–2

- [ ] 변경 파일이 정확히 2개다
- [ ] template과 SKILL.md가 서로 모순되지 않는다 (Verification 룰 ↔ 예시 일치)
- [ ] 다음 `/draft-plan`이 UI task에 MCP 단계, 사람 검증이 필요한 task에 reviewer 명시를 자연스럽게 포함하는지는 다음 feature plan에서 육안 확인

## Out of Scope

- `execute-plan/SKILL.md` 수정 — drafter가 명시하면 executor가 그대로 따르므로 별도 강제 룰 불필요
- evidence 디렉토리 정책 (`.gitignore` 등) — 첫 evidence가 실제로 쌓일 때 결정

## Undecided Items

None.
