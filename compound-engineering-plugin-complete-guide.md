---
title: "Compound Engineering Plugin 완전 가이드"
date: 2026-03-24
tags:
  - programming/claude-code
  - ai/agents
  - productivity/automation
  - productivity/workflows
aliases:
  - "Compound Engineering Guide"
  - "CE 플러그인 워크플로우"
  - "Every Compound Engineering"
description: "Every의 Compound Engineering 플러그인 전체 워크플로우 분석. Ideate→Brainstorm→Plan→Work→Review→Compound 6단계 사이클과 Swarm Mode, Worktree, Plan Beta 등 보조 스킬을 포함한 완전 가이드."
source: "https://github.com/EveryInc/compound-engineering-plugin"
---

# Compound Engineering Plugin 완전 가이드

[Every](https://every.to/)에서 만든 Claude Code 플러그인으로, **"각 엔지니어링 작업이 이후 작업을 더 쉽게 만들어야 한다"** 는 철학을 기반으로 한다. 전통적 개발은 기술 부채가 쌓여가지만, 이 플러그인은 그 반대를 지향한다. 핵심 비율은 **80%는 계획과 리뷰, 20%가 실행**이다.

## TLDR: 전체 워크플로우

```
  Ideate → Brainstorm → Plan → Work → Review → Compound → Repeat
    ↑                                                  │
    └──────────── docs/solutions/가 다음 사이클에 ──────┘
                     입력으로 재활용됨
```

| 단계 | 명령 | 핵심 질문 | 산출물 |
|------|------|----------|--------|
| **Ideate** | `/ce:ideate` | 무엇을 개선할까? | `docs/ideation/` 문서 (5-7개 생존 아이디어) |
| **Brainstorm** | `/ce:brainstorm` | 무엇을 만들까? | `docs/brainstorms/...-requirements.md` (경량 PRD) |
| **Plan** | `/ce:plan` | 어떻게 만들까? | `docs/plans/...-plan.md` |
| **Work** | `/ce:work` | 만들고 배송하자 | 커밋 + PR + Plan status: completed |
| **Review** | `/ce:review` | 품질이 충분한가? | `todos/` 디렉토리의 구조화된 할 일 파일 |
| **Compound** | `/ce:compound` | 무엇을 배웠나? | `docs/solutions/{category}/{filename}.md` |

각 사이클의 산출물(`docs/solutions/`)이 다음 사이클의 입력이 되어, `learnings-researcher` 에이전트가 과거 해결책을 자동으로 참조한다. 이것이 "Compound"(복리)의 핵심이다.

---

## 1단계: `/ce:ideate` — 아이디어 발굴

**목적:** "무엇을 개선할까?"에 대한 답을 찾는 단계

### 실행 흐름

```
Phase 0: 이전 작업 확인 + 스코프 설정
    ↓
Phase 1: 코드베이스 스캔 (3개 에이전트 병렬)
    ↓
Phase 2: 발산적 아이디어 생성 (4-6개 에이전트 병렬)
    ↓
Phase 3: 적대적 필터링
    ↓
Phase 4-5: 프레젠테이션 + 문서화
    ↓
Phase 6: 핸드오프 (→ ce:brainstorm)
```

### Phase 0: Resume & Scope

사용자 입력에서 3가지를 추론한다:

- **Focus context**: 개념(`DX improvements`), 경로(`plugins/.../skills/`), 제약(`low-complexity quick wins`)
- **Volume override**: `top 3`, `100 ideas`, `raise the bar`
- **Issue-tracker intent**: `bugs`, `github issues`, `open issues`

`docs/ideation/`에서 최근 30일 내 관련 문서가 있으면 이어서 작업할지 묻는다.

### Phase 1: 코드베이스 스캔 — 3개 에이전트 병렬 실행

아이디어를 "허공에서" 만들지 않기 위해, 먼저 실제 프로젝트 상태를 파악한다.

**에이전트 1: Quick Context Scan (general-purpose 서브에이전트)**

프로젝트의 큰 그림을 파악한다. `AGENTS.md` / `CLAUDE.md` / `README.md`를 읽고, 최상위 디렉토리 구조를 탐색해서 30줄 이내로 요약한다: 프로젝트 형태, 주목할 패턴/컨벤션, 명백한 페인 포인트, 개선 레버리지 포인트.

**에이전트 2: `learnings-researcher`**

`docs/solutions/` 디렉토리에 축적된 과거 해결 문서를 검색한다. Grep으로 frontmatter를 사전 필터링해서 후보 파일만 추린 뒤, 관련성 점수를 매기고 Strong/Moderate 파일만 전체 읽어서 핵심 인사이트를 반환한다. 항상 `docs/solutions/patterns/critical-patterns.md`도 확인한다.

**에이전트 3: `issue-intelligence-analyst` (조건부)**

사용자가 이슈 트래커 의도를 표현했을 때만 실행된다. GitHub에서 오픈 이슈 최대 100개 + 최근 30일 닫힌 이슈 50개를 수집하고(body는 500자로 잘라 토큰 절약), 개별 버그가 아닌 **시스템 수준의 약점 테마**로 클러스터링한다. 예를 들어, `LIVE_DOC_UNAVAILABLE` 25건 + `PROJECTION_STALE` 5건은 "collaboration write path reliability"라는 하나의 테마가 된다. 오픈 이슈로 테마를 형성하고, 닫힌 이슈로 재발 신호를 확인한다. 3-8개 테마를 산출한다.

3개 에이전트 결과를 **grounding summary**로 통합한다: Codebase context + Past learnings + Issue intelligence.

### Phase 2: 발산적 아이디어 생성

4-6개 서브에이전트가 각각 **다른 관점(frame)**에서 아이디어를 생성한다.

이슈 트래커 의도가 없을 때 기본 프레임:

| 프레임 | 관점 |
|--------|------|
| User/operator pain & friction | 사용자가 겪는 고통과 마찰 |
| Unmet need or missing capability | 충족되지 않은 니즈 |
| Inversion, removal, or automation | 고통스러운 단계를 제거/자동화 |
| Assumption-breaking or reframing | 기존 가정을 깨는 시각 |
| Leverage and compounding effects | 복리 효과를 낳는 레버리지 |
| Extreme/edge/power-user pressure | 극단적 사용자 관점 |

이슈 트래커 의도가 있으면 `confidence: high/medium`인 이슈 테마가 각각 하나의 프레임이 된다 (4개 미만이면 기본 프레임으로 보충, 최대 6개).

프레임은 **출발점 편향**이지 제약이 아니다 — 다른 영역으로 넘어가는 아이디어도 환영한다. 각 에이전트는 ~7-8개 아이디어 생성 → 합치면 30-40개 → 중복 제거 후 20-30개. 에이전트 간 취합 후 **교차 조합 아이디어** 3-5개를 추가 합성한다 (오케스트레이터가 전체를 보고 수행).

### Phase 3: 적대적 필터링

2중 비평 구조로 필터링한다. 회의론적 서브에이전트가 다른 각도에서 아이디어 목록을 공격하고, 오케스트레이터가 비평을 종합해 일관된 루브릭으로 최종 점수/순위를 결정한다.

탈락 기준: 너무 모호, 실행 불가, 더 강한 아이디어와 중복, 현재 코드베이스에 근거 없음, 비용 대비 가치 부족, 기존 워크플로우가 이미 커버.

생존 루브릭: 현재 레포에 대한 근거성, 기대 가치, 참신성, 실용성, 미래 작업에 대한 레버리지, 구현 부담, 겹침. **목표: 5-7개 생존자.**

### Phase 4-6: 프레젠테이션 → 문서화 → 핸드오프

생존 아이디어를 구조화해서 제시하고(title, description, rationale, downsides, confidence, complexity), `docs/ideation/YYYY-MM-DD-<topic>-ideation.md`에 기록한다. 사용자가 하나를 선택하면 `/ce:brainstorm`으로 핸드오프한다.

---

## 2단계: `/ce:brainstorm` — 요구사항 탐색

**목적:** "무엇을 만들까?"를 구체화하는 단계. 코드를 작성하지 않는다. 제품 결정(behavior, scope, success criteria)만 다룬다.

### 실행 흐름

```
Phase 0: Resume, Assess, Route
  ├── 기존 작업 이어가기
  ├── 브레인스토밍 필요 여부 판단
  └── 스코프 분류 (Lightweight / Standard / Deep)
    ↓
Phase 1: Understand the Idea
  ├── 기존 컨텍스트 스캔
  ├── Product Pressure Test
  └── 협업적 대화
    ↓
Phase 2: 2-3개 접근법 비교 제시
    ↓
Phase 3: Requirements 문서 작성
    ↓
Phase 4: 핸드오프
```

### Phase 0: Resume, Assess, Route

`docs/brainstorms/`에서 최근 `*-requirements.md`가 주제와 매칭되면 이어가기를 제안한다. 이미 요구사항이 명확하면(구체적 수락 기준, 기존 패턴 참조, 정확한 기대 동작) Phase 1.1, 1.2를 건너뛴다.

스코프를 **Lightweight** (작고 경계 명확) / **Standard** (일반 기능, 일부 결정 필요) / **Deep** (교차 관심사, 전략적, 높은 모호함)으로 분류한다.

### Phase 1: Understand the Idea

**1.1 기존 컨텍스트 스캔**: Lightweight는 주제 검색만. Standard/Deep은 Constraint Check (프로젝트 규칙/제약 확인) + Topic Scan (관련 기존 산출물 확인).

**1.2 Product Pressure Test**: 접근법 생성 전에 요청 자체에 도전한다.

- Lightweight: "진짜 문제를 해결하는가?", "이미 커버하는 것이 있는가?", "더 나은 프레이밍이 있는가?"
- Standard: "진짜 문제인가 대리인가?", "실제로 중요한 결과는?", "아무것도 안 하면?", "carrying cost 없이 더 많은 가치를 주는 프레이밍은?", "현재 상황에서 가장 레버리지 높은 수는?"
- Deep: Standard + "6-12개월 후 만들어야 할 지속적 역량은?", "이것이 그 방향으로 가는가?"

**1.3 협업적 대화**: **한 번에 하나의 질문만.** 넓은 것(문제/사용자/가치) → 좁은 것(제약/엣지케이스/성공기준). 단순히 인터뷰하는 것이 아니라 아이디어, 대안, 도전을 제시하는 thinking partner 역할.

### Phase 2: 접근법 탐색

여러 방향이 남아있을 때 2-3개 접근법을 비교 제시한다. 각 접근법에 간결한 설명, 장단점, 핵심 리스크, 적합 상황을 포함하고 추천과 근거를 명시한다. 선택적으로 "비용은 비슷하지만 복리 가치가 높은" challenger option을 포함한다.

### Phase 3: Requirements 문서 작성

산출물은 `docs/brainstorms/YYYY-MM-DD-<topic>-requirements.md`이다.

핵심 구조:

```markdown
## Problem Frame
## Requirements (R1, R2...)
## Success Criteria
## Scope Boundaries
## Key Decisions
## Outstanding Questions
  ### Resolve Before Planning   ← 이것이 비어야 Plan으로 갈 수 있음
  ### Deferred to Planning      ← Plan 단계에서 해결해도 되는 것
```

**절대 포함하지 않는 것:** 라이브러리, 스키마, 엔드포인트, 파일 레이아웃, 코드 구조 (예외: 브레인스토밍 자체가 기술/아키텍처 결정에 관한 것일 때).

### Phase 4: 핸드오프

`Resolve Before Planning`이 비어있으면 Plan으로 진행. 남아있으면 Plan 옵션을 제공하지 않고 blocking questions를 먼저 해결하도록 유도한다. "Proceed directly to work"는 Lightweight + 성공기준 명확 + 범위 명확 + 기술 질문 없을 때만 제공된다.

---

## 3단계: `/ce:plan` — 구현 계획 수립

**목적:** "어떻게 만들까?"를 설계하는 단계. 코드를 작성하지 않는다.

### 실행 흐름

```
Step 0: Requirements 문서 로드 또는 대화형 질문
    ↓
Step 1: Local Research (2개 에이전트 병렬)
    ↓
Step 1.5: 외부 리서치 필요 여부 판단
    ↓
Step 1.5b: External Research (조건부, 2개 에이전트 병렬)
    ↓
Step 1.6: 리서치 통합
    ↓
Step 3: SpecFlow Analysis
    ↓
Step 4: 디테일 레벨 선택
    ↓
Write Plan File → Post-Generation Options
```

### Step 0: Idea Refinement

**경로 A (brainstorm → plan):** `docs/brainstorms/`에서 14일 이내 매칭되는 requirements 문서를 로드한다. 모든 결정, 요구사항, 범위, 미결정 사항을 이월하고 `(see origin: <source-path>)`로 원본을 참조한다. `Resolve Before Planning`에 항목이 남아있으면 **즉시 중단**.

**경로 B (직접 진입):** AskUserQuestion으로 대화형 질문을 진행한다. 목적, 제약, 성공 기준에 집중.

### Step 1: Local Research

2개 에이전트가 동시에 실행된다:

- **`repo-research-analyst`**: 기술 스택/버전, 아키텍처 패턴, 구현 패턴. 루트 글로빙 → 매니페스트 감지 → 모노레포 감지 → 인프라/API surface → 모듈 구조 순으로 스캔한다.
- **`learnings-researcher`**: `docs/solutions/`에서 관련 과거 해결책, 함정, 패턴 검색.

### Step 1.5: Research Decision

| 조건 | 판단 |
|------|------|
| 고위험 (보안/결제/외부 API) | 항상 리서치 |
| 코드베이스에 강한 로컬 패턴 | 건너뜀 |
| 불확실/미지의 영역 | 리서치 |

외부 리서치가 필요하면 `best-practices-researcher` + `framework-docs-researcher`를 병렬 실행한다.

### Step 3: SpecFlow Analysis

`spec-flow-analyzer` 에이전트가 사양을 검증하고 갭/엣지케이스를 발견한다.

### 디테일 레벨 (Stable 버전)

| 레벨 | 적합 | 포함 내용 |
|------|------|----------|
| **MINIMAL** | 간단한 버그, 작은 개선 | 수락 기준 + 컨텍스트 + MVP 코드 |
| **MORE** | 대부분의 기능 | + Overview + Proposed Solution + Technical Considerations + System-Wide Impact |
| **A LOT** | 대규모 아키텍처 변경 | + Implementation Phases + Alternatives + Risk Analysis + Resources + Future |

**System-Wide Impact의 5가지 질문:** Interaction graph (콜백/미들웨어 발화), Error propagation (에러 흐름), State lifecycle risks (고아/불일치 상태), API surface parity (다른 인터페이스의 동일 변경 필요), Integration test scenarios (유닛 테스트가 못 잡는 시나리오).

### Post-Generation Options

Plan 작성 후 7가지 옵션: Open in editor / `/deepen-plan` / Review and refine / Share to Proof / `/ce:work` / `/ce:work` on remote / Create Issue (GitHub/Linear).

---

## 3-1단계: `/ce:plan-beta` — Stable과의 핵심 차이

Beta는 "사람이 읽는 이슈"에서 **"에이전트가 실행하는 작업 명세"**로 플랜의 성격을 전환한 버전이다.

### 핵심 변경점

| 영역 | Stable | Beta |
|------|--------|------|
| **설계 철학** | 이슈 트래커 기반 — 3단계 템플릿 선택 | 구현 가이드 기반 — 단일 템플릿 + 깊이별 자동 조절 |
| **핵심 단위** | Acceptance Criteria (체크리스트) | **Implementation Units** (실행 가능한 작업 단위) |
| **코드 포함** | MVP 섹션에 의사 코드 예시 | 코드 **금지** — pseudo-code sketch만 "directional guidance"로 허용 |
| **실행 자세** | 없음 | Execution note (test-first, characterization-first, external-delegate) |
| **Requirements 문서 없을 때** | 바로 질문 시작 | Planning bootstrap fallback (최소 제품 명확성 확보 후 진행) |
| **Blocking question** | 무조건 차단 | 기술 질문은 planning-owned로 재분류 가능 |
| **Planning/Execution 미지수** | 혼재 | 명시적 Phase 2로 분리 |

### Implementation Units (Beta 핵심)

각 Unit의 구조:

- **Goal**: 이 unit이 달성하는 것
- **Requirements**: R1, R2
- **Dependencies**: None / Unit 1 / 외부 전제조건
- **Files**: Create/Modify/Test 경로
- **Approach**: 핵심 설계/순서 결정
- **Execution note**: (선택) test-first, characterization-first, external-delegate
- **Technical design**: (선택) directional guidance
- **Patterns to follow**: 따를 기존 코드/컨벤션
- **Test scenarios**: 구체적 행동, 엣지케이스, 실패 경로
- **Verification**: 완료 확인 방법 (결과 기반, 명령어 스크립트 아님)

좋은 unit: 하나의 컴포넌트/행동에 집중, 작은 관련 파일 클러스터, 의존성 순서 정렬, atomic commit으로 랜딩 가능.

---

## 4단계: `/ce:work` — 실행 및 배송

**목적:** 계획을 코드로 구현하고 PR로 배송하는 단계.

### 실행 흐름

```
Phase 1: Quick Start
  플랜 읽기 → 환경 설정 → 태스크 리스트 → 실행 전략 선택
    ↓
Phase 2: Execute
  태스크 루프 (구현 → 테스트 → System-Wide Test Check → 증분 커밋)
    ↓
Phase 3: Quality Check
  전체 테스트 + 린트 + 리뷰어 에이전트(선택) + 운영 검증 계획(필수)
    ↓
Phase 4: Ship It
  최종 커밋 → PR 생성 → Plan status: completed
```

### Phase 1: Quick Start

플랜을 완전히 읽고 Implementation Units, Execution notes, Deferred to Implementation, Scope Boundaries, Patterns to follow, Verification을 확인한다.

환경 설정: 새 브랜치 / **Worktree** (병렬 개발 권장) / Default 브랜치(명시적 확인 필요) 중 선택.

실행 전략 선택:

| 전략 | 조건 |
|------|------|
| **Inline** | 1-2개 작은 태스크 |
| **Serial subagents** | 3+ 태스크, 의존성 있음 — 컨텍스트 오염 방지 |
| **Parallel subagents** | 3+ 태스크, 일부 독립적 — 동시 실행 |
| **Swarm Mode** | 10+ 태스크, 에이전트 간 토론 필요 (사용자 명시적 요청 시에만) |

### Phase 2: Execute

**태스크 실행 루프**: 참조 파일 읽기 → 유사 패턴 검색 → 기존 컨벤션 따라 구현 → 테스트 작성 → System-Wide Test Check → 테스트 실행 → 증분 커밋 판단.

**System-Wide Test Check** — 각 태스크 완료 전 5가지 자가 점검:

1. 이 코드가 실행될 때 무엇이 발화하는가? (콜백, 미들웨어, after_* 훅)
2. 내 테스트가 실제 체인을 실행하는가? (mock만이면 격리 증명일 뿐)
3. 실패가 고아 상태를 남길 수 있는가? (상태 저장 후 서비스 실패 시)
4. 이 기능을 노출하는 다른 인터페이스가 있는가? (Mixin, DSL, 대안 진입점)
5. 에러 전략이 레이어 간 정렬되는가? (재시도/fallback 충돌 여부)

**증분 커밋 휴리스틱**: "완전하고 가치 있는 변경을 설명하는 커밋 메시지를 쓸 수 있으면 커밋. 'WIP'가 필요하면 대기."

### Phase 3: Quality Check

전체 테스트 스위트 + 린팅 실행. 리뷰어 에이전트는 10+ 파일 리팩터, 보안 민감 변경, 성능 핵심 코드, 복잡한 로직일 때만 사용한다. **운영 검증 계획**은 모든 PR에 필수 — 로그 쿼리, 감시 대시보드, 정상/실패 신호, 롤백 트리거, 검증 기간/담당자를 포함한다.

### Phase 4: Ship It

최종 커밋(attribution 포함) → PR 생성(Summary + Testing + Post-Deploy Monitoring + Screenshots) → Plan의 `status: active`를 `completed`로 업데이트.

---

## 5단계: `/ce:review` — 멀티 에이전트 코드 리뷰

**목적:** PR을 다각도로 검증하고, 발견 사항을 구조화된 할 일로 남기는 단계.

### 실행 흐름

```
Step 1: 대상 파악 + 에이전트 설정 + 실행
    ↓
Step 2: Ultra-Thinking Deep Dive (이해관계자 관점 + 시나리오 탐색)
    ↓
Step 3-4: Multi-Angle Review + Simplification Review
    ↓
Step 5: 발견 사항 → Todo 파일 즉시 생성
    ↓
Step 6: End-to-End Testing (선택적)
```

### 에이전트 구성

**사용자 설정 에이전트**: `compound-engineering.local.md`의 `review_agents`에서 로드. 5개 이하면 병렬, 6+ 이면 자동 직렬 전환.

**항상 실행**: `agent-native-reviewer` (에이전트 접근 가능성) + `learnings-researcher` (과거 이슈 패턴)

**조건부 (DB 마이그레이션 시)**: `schema-drift-detector` (로컬 DB 상태의 무관한 변경 탐지) + `data-migration-expert` (ID 매핑 프로덕션 검증) + `deployment-verification-agent` (Go/No-Go 체크리스트)

### Ultra-Thinking Deep Dive

5가지 이해관계자 관점(Developer, Operations, End User, Security, Business) + 10가지 시나리오(Happy Path부터 Cascading Failures까지) 분석.

### Findings → Todo

발견 사항을 **사용자 승인 없이 즉시** todo 파일로 생성한다.

- **P1** (CRITICAL): 머지 차단 — 보안 취약점, 데이터 손상 리스크, breaking changes
- **P2** (IMPORTANT): 수정 권장 — 성능 이슈, 아키텍처 우려, 신뢰성
- **P3** (NICE-TO-HAVE): 개선 — 마이너 개선, 코드 정리, 최적화

각 todo 파일: Problem Statement + Findings + 2-3 Proposed Solutions + Acceptance Criteria + Work Log

**Protected Artifacts**: `docs/brainstorms/`, `docs/plans/`, `docs/solutions/`의 삭제 권고는 자동 폐기.

---

## 6단계: `/ce:compound` — 지식 축적

**목적:** 해결한 문제를 문서화해서 팀 지식을 복리로 쌓는 단계.

### 실행 흐름

```
Phase 0.5: Auto Memory Scan
    ↓
Phase 1: 5개 에이전트 병렬 (파일 생성 금지)
    ↓
Phase 2: 오케스트레이터가 단일 파일 작성
    ↓
Phase 2.5: 기존 문서 무효화 확인 (Selective Refresh)
    ↓
Phase 3: 전문 에이전트 추가 리뷰 (선택적)
```

### Phase 1: 5개 에이전트 병렬

| 에이전트 | 반환값 |
|---------|--------|
| **Context Analyzer** | 문제 유형/증상 → frontmatter 스켈레톤 |
| **Solution Extractor** | 근본 원인 + 해결책 + 코드 예시 |
| **Related Docs Finder** | 관련 문서 + 오래된 문서 플래그 |
| **Prevention Strategist** | 예방 전략 + 테스트 케이스 |
| **Category Classifier** | 카테고리 + 파일명 |

### Phase 2: Assembly

오케스트레이터가 모든 결과를 조립해서 `docs/solutions/{category}/{filename}.md`에 단일 파일 작성. 카테고리: build-errors, test-failures, runtime-errors, performance-issues, database-issues, security-issues, ui-bugs, integration-issues, logic-errors.

### Phase 2.5: Selective Refresh

새 해결책이 기존 문서를 무효화하면 `ce:compound-refresh`를 호출한다. 관련 문서가 이번 수정과 모순되거나, 새 수정이 이전 해결책을 대체하거나, 리팩터/마이그레이션으로 참조가 무효화된 경우에만. 단일 파일, 모듈명, 카테고리명으로 좁은 범위를 지정한다.

### Compact-Safe Mode

컨텍스트 부족 시 서브에이전트 없이 오케스트레이터 혼자 최소 문서 작성. `/ce:compound --compact`로 사용.

### 복리 피드백 루프

```
ce:compound가 작성한 docs/solutions/ →
  ce:plan의 learnings-researcher가 검색 →
  ce:review의 learnings-researcher가 참조 →
  ce:ideate의 grounding에 활용 →
  다음 사이클이 더 빨라짐
```

---

## 보조 스킬: `git-worktree`

### 목적

격리된 병렬 개발 환경을 관리한다. Git worktree를 사용해서 하나의 레포에서 여러 브랜치를 동시에 다른 디렉토리에서 작업할 수 있게 한다.

### 사용 시점

- `/ce:review`: PR 대상 브랜치가 아닐 때 격리된 리뷰 환경 제안
- `/ce:work`: 새 브랜치 vs worktree 선택 제공
- 병렬 개발: 여러 기능 동시 작업

### 핵심 명령어

```bash
worktree-manager.sh create feature-login      # 생성 (.env 복사 + dev tool trust)
worktree-manager.sh list                       # 목록
worktree-manager.sh switch feature-login       # 전환
worktree-manager.sh copy-env feature-login     # .env 파일만 복사
worktree-manager.sh cleanup                    # 비활성 정리
```

**절대 `git worktree add` 직접 호출 금지** — 스크립트가 .env 복사, mise/direnv trust, .gitignore 관리를 자동 처리한다.

### worktree-manager.sh 핵심 로직

- **`copy_env_files()`**: `.env*` 파일을 메인 레포에서 worktree로 복사 (`.env.example` 제외, 기존 파일은 `.backup`으로 백업)
- **`trust_dev_tools()`**: mise/direnv config를 base 브랜치와 해시 비교 후 동일하면 auto-trust. 심볼릭 링크 거부.
- **`is_trusted_base_branch()`**: `main`, `develop`, `dev`, `trunk`, `staging`, `release/*`만 trusted. direnv auto-allow는 trusted base에서만 허용 (`.envrc`가 검증 안 된 파일을 source할 수 있으므로).
- **`_config_unchanged()`**: `git rev-parse`로 base의 blob 해시 vs `git hash-object`로 worktree 파일 해시 비교. 불일치 시 trust 건너뜀 (안전한 방향).

---

## 보조 스킬: Swarm Mode (`orchestrating-swarms`)

### 목적

10+ 태스크의 대규모 플랜에서 에이전트 간 **지속적 통신과 조정**이 필요할 때 사용하는 멀티 에이전트 오케스트레이션 시스템.

### 핵심 개념

- **Team**: 리더 1명 + 여러 Teammate
- **Teammate**: 팀에 참여한 에이전트. inbox로 통신, 공유 태스크 리스트 접근, shutdown까지 지속
- **Task**: 의존성 지원 — `addBlockedBy`로 설정하면 선행 태스크 완료 시 자동 unblock
- **Inbox**: `~/.claude/teams/{team}/inboxes/`에 JSON 파일로 메시지 교환

### Subagent vs Teammate

| | Subagent (기본) | Teammate (Swarm) |
|--|-----------------|-----------------|
| 수명 | 태스크 완료까지 | shutdown까지 지속 |
| 통신 | 결과값 반환만 | inbox 메시지 (양방향) |
| 태스크 접근 | 없음 | 공유 태스크 리스트 |
| 조정 | 일회성 | 지속적 |

### 6가지 오케스트레이션 패턴

| 패턴 | 구조 | 언제 |
|------|------|------|
| **Parallel Specialists** | 여러 전문가 동시 → 리더 종합 | 코드 리뷰 |
| **Pipeline** | #1→#2→#3 순차 의존, 자동 unblock | 리서치→계획→구현→테스트 |
| **Self-Organizing Swarm** | 워커들이 태스크 풀에서 경쟁 claim | 독립 파일 다수 처리 |
| **Research → Implementation** | 동기 리서치 → 결과를 구현 프롬프트에 전달 | 조사 후 구현 |
| **Plan Approval** | Teammate가 plan 제출 → 리더 승인/거절 | 신중한 작업 |
| **Multi-File Refactoring** | 파일별 병렬 → 테스트는 전체 완료 후 | 조율된 리팩터 |

### 3가지 Backend

| Backend | 가시성 | 지속성 | 속도 |
|---------|--------|--------|------|
| **in-process** | 숨김 | 리더와 함께 종료 | 가장 빠름 |
| **tmux** | pane에서 보임 | 리더 종료 후에도 유지 | 중간 |
| **iterm2** | split pane에서 보임 | 윈도우와 함께 종료 | 중간 |

자동 감지: `$TMUX` 있으면 tmux, iTerm2 + it2 CLI면 iterm2, 아니면 in-process.

### 라이프사이클

```
spawnTeam → TaskCreate → Task(teammate, run_in_background) → 작업/조정
→ requestShutdown → approveShutdown 대기 → cleanup
```

활성 멤버가 있으면 cleanup 실패. 크래시된 teammate는 5분 heartbeat timeout 후 자동 비활성화.

---

## 복리 피드백 루프 전체 그림

```
                    ┌────── docs/solutions/ ──────┐
                    │                              │
  ce:compound → 문서화 → learnings-researcher가 → ce:plan, ce:ideate
       ↑                 다음 사이클에서 검색          │
       │                                              ↓
     문제 해결 ←── ce:work ←── Plan 실행 ←──── ce:review
                                                   │
                                              todos/ 생성
```

- 첫 번째 해결: 30분 리서치
- 문서화: 5분
- 다음 동일 문제: 2분 조회
- **각 사이클의 산출물이 다음 사이클의 입력이 되어, 팀이 점점 더 빨라진다**
