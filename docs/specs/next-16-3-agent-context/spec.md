# Next.js 16.3 업그레이드와 공용 에이전트 컨텍스트

## 목적

Claude Hunt를 Next.js 16.3.2로 올리고, Codex와 Claude Code가 같은 프로젝트 지침과 공식 Next.js·Supabase 컨텍스트를 사용하게 한다. Claude Code에만 묶인 스킬·agent·hook·rule은 제거하고, 계속 필요한 프로젝트 고유 규칙은 Project Knowledge에 보존한다.

## 기대 결과

- 애플리케이션은 Next.js 16.3.2에서 기존 기능과 화면 동작을 유지한다.
- Next.js 작업은 설치된 `next` 패키지의 버전 일치 문서와 공식 `next-dev-loop`를 사용한다.
- Supabase 작업은 공식 `supabase`와 `supabase-postgres-best-practices` 스킬 및 저장소의 결정 계약을 함께 사용한다.
- Codex와 Claude Code는 루트 `AGENTS.md`를 같은 프로젝트 지침으로 읽는다.
- Claude Code 전용 확장에 의존하지 않아도 프로젝트의 핵심 개발 규칙과 검증 흐름이 유지된다.

## 승인된 범위

### Next.js 업그레이드

- Next.js 16.1.7을 현재 최신 안정판인 16.3.2로 올린다.
- 공식 `@next/codemod`의 `upgrade` 명령을 사용한다.
- React, React DOM과 관련 타입 패키지는 codemod가 Next.js 16.3.2 호환을 위해 요구하는 범위에서 함께 정렬한다.
- Next.js 16.3이 관리하는 `nextjs-agent-rules` 블록을 루트 `AGENTS.md`에 추가한다.
- Next.js가 관리하는 블록 밖의 프로젝트 지침은 그대로 유지한다.

### 공용 프로젝트 지침

- 현재 `CLAUDE.md`의 프로젝트 지침을 표준 루트 `AGENTS.md`로 옮긴다.
- `CLAUDE.md`는 `@AGENTS.md`만 포함해 Claude Code가 같은 원본을 읽게 한다.
- `AGENTS.md`는 제품 용어, 동작, 데이터 소유권, 스키마를 바꾸기 전에 `GLOSSARY.md`와 `docs/decisions/README.md`에서 관련 결정 계약을 읽도록 지시한다.
- `.claude/settings.json`에서는 원격 배포 명령의 확인 권한만 유지하고 hook 등록과 사용하지 않는 agent-team 환경 설정을 제거한다.

### Project Knowledge

- `docs/decisions/supabase-schema-workflow.md`를 추가하고 결정 인덱스에 연결한다.
- 다음 프로젝트 고유 불변식과 작업 흐름을 이 결정 계약에 보존한다.
  - `public.profiles`가 `auth.users`와 도메인 테이블 사이의 유일한 데이터베이스 경계다.
  - 모든 `public` 테이블은 마지막 두 컬럼으로 `created_at`과 `updated_at`을 가지며 기존 `extensions.moddatetime(updated_at)` 트리거를 사용한다.
  - `supabase/schemas/`가 선언형 스키마 원본이고 일반 구조 변경은 `supabase db diff -f <name>`으로 생성한다.
  - 생성 migration은 신뢰하지 않는 초안으로 취급하며 파괴적 변경, 권한·RLS, diff 미지원 객체, 의존 순서를 검토한다.
  - DML, Storage처럼 선언형 diff가 표현하지 못하는 객체만 수동 migration으로 보완한다.
  - 적용된 migration은 수정하지 않고 새 forward migration을 추가하며 임의의 `BEGIN`·`COMMIT`을 넣지 않는다.
  - `supabase db reset`, pgTAP, 로컬 타입 생성으로 전체 기록과 최종 계약을 검증한다.
  - 스키마, migration, 데이터베이스 테스트와 생성 타입은 하나의 논리적 변경으로 커밋한다.
- 새 테이블은 RLS뿐 아니라 `anon`, `authenticated`, `service_role`, `PUBLIC`의 실제 테이블·함수 권한을 검토한다.
- 기존 `GLOSSARY.md`와 제품 결정 계약을 사용자 문구의 정본으로 사용하고 별도의 `ux-writing` rule은 유지하지 않는다.
- shadcn 컴포넌트 직접 수정을 일괄 금지하는 규칙은 프로젝트 불변식으로 보존하지 않는다.

### 스킬 정리와 공식 스킬 설치

- 공용 프로젝트 스킬은 `.agents/skills`를 정본으로 유지하고 `.claude/skills`는 같은 디렉터리를 가리키는 symlink로 제공한다.
- Next.js가 더 이상 유지하지 않는 `next-best-practices`와 프로젝트 전용 `nextjs`를 제거한다.
- 프로젝트 전용 `supabase`를 제거한다.
- `supabase/agent-skills`의 공식 `supabase`와 `supabase-postgres-best-practices`를 설치한다.
- `vercel/next.js`의 공식 `next-dev-loop`만 Next.js workflow 스킬로 설치한다.
- 다음 Claude Code 전용 스킬과 그 전용 보조 자료를 제거한다.
  - `api-and-interface-design`, `browser-testing-with-devtools`, `ci-cd-and-automation`, `context-engineering`
  - `debugging-and-error-recovery`, `deprecation-and-migration`, `find-skills`, `frontend-ui-engineering`, `fsd`, `init-project`
  - `integration-nextjs-app-router`, `performance-optimization`, `refactor`, `security-and-hardening`, `self-improve`, `shadcn`, `ship`, `skill-creator`, `source-driven-development`
  - `vercel`, `vercel-composition-patterns`, `vercel-react-best-practices`, `vercel-react-view-transitions`, `web-design-guidelines`

### Claude Code 전용 자동화 제거

- `.claude/agents/`의 모든 custom agent를 제거한다.
- `.claude/hooks/`의 모든 hook과 `.claude/settings.json`의 hook 등록을 제거한다.
- `.claude/rules/`의 모든 rule을 제거한다. 계속 필요한 Supabase 규칙은 Project Knowledge 결정 계약에만 남긴다.
- 삭제한 스킬을 보조하던 `.claude/references/`의 일반 체크리스트를 제거한다.
- 제거된 파일을 가리키는 활성 주석, 설정과 잠금 정보를 함께 정리한다. 이미 적용된 migration 파일은 불변 기록이므로 과거 주석을 수정하지 않는다.

## 수용 기준

- 설치된 `next`가 목표 안정판 16.3.2와 일치하고 업그레이드는 `@next/codemod@16.3.2`로 실행한다.
- 타입 검사, 단위 테스트, 정적 검사와 프로덕션 빌드가 모두 통과한다.
- 기존 애플리케이션 경로와 주요 사용자 흐름이 업그레이드 전과 동일하게 동작한다.
- `AGENTS.md`에 기존 프로젝트 지침과 Next.js 관리 블록이 공존하고 `CLAUDE.md`는 `@AGENTS.md`만 포함한다.
- `next dev`를 다시 실행해도 프로젝트 지침은 유지되고 Next.js 관리 블록만 갱신된다.
- `next-best-practices`, 프로젝트 전용 `nextjs`와 프로젝트 전용 `supabase`가 더 이상 발견되지 않는다.
- 공식 `next-dev-loop`의 출처가 `vercel/next.js`로 기록된다.
- 공식 `supabase`와 `supabase-postgres-best-practices`의 출처가 `supabase/agent-skills`로 기록된다.
- 세 공식 스킬을 Codex와 Claude Code 양쪽에서 같은 내용으로 발견할 수 있다.
- `.claude/agents/`, `.claude/hooks/`, `.claude/rules/`, `.claude/references/`와 그 활성 설정 참조가 남지 않는다. 이미 적용된 migration의 역사적 주석은 제외한다.
- `docs/decisions/README.md`에서 Supabase schema 또는 migration 변경 시 새 결정 계약을 찾을 수 있다.
- Supabase workflow 결정 계약은 선언형 원본, 생성 초안 검토, forward-only migration, 권한 검토, 전체 재생, pgTAP과 타입 생성을 포함한다.
- Turbopack 개발 서버에서 `next-dev-loop`가 컴파일 진단, 경로 조회, 브라우저와 React 상태를 확인한다.
- 설치된 `agent-browser` 0.34.0을 사용한 브라우저 및 React 검증이 실행 가능하다.

## 제약과 근거

- 안정판만 사용한다. Canary 런타임 기능은 이번 업그레이드 범위가 아니다.
- Next.js framework 지식은 16.3.2 패키지에 번들된 문서를 사용하고, `next-dev-loop`는 실행·검증 workflow만 담당한다.
- Supabase의 시점 의존 동작은 공식 스킬과 현재 공식 문서를 확인한다. 결정 계약에는 이 저장소가 선택한 경계와 재현 가능한 workflow만 둔다.
- 생성 migration의 모든 cross-schema 또는 extension 변경을 영구적으로 잡음이라고 단정하지 않는다. 명시적인 의도와 프로젝트 근거가 없는 경우에만 고위험 변경으로 차단한다.
- custom migration reviewer는 설치하지 않는다. 구현 agent가 공식 Supabase 스킬과 결정 계약을 읽고 같은 변경 안에서 검토와 검증 증거를 남긴다.
- “공식 스킬만”은 Next.js·Supabase 관련 스킬을 뜻한다. 제품 개발 흐름과 디자인 등 다른 목적의 공용 프로젝트 스킬은 유지한다.
- Supabase 의존성과 애플리케이션 기능은 유지한다.

## 범위 밖

- Cache Components, Partial Prefetching 또는 다른 Next.js 16.3 기능의 신규 도입
- 애플리케이션 UI, 도메인 동작 또는 데이터베이스 스키마 변경
- Supabase 패키지, 로컬 개발 환경 또는 데이터베이스 workflow 제거
- Next.js 공식 저장소의 다른 선택형 스킬 설치
- Supabase 공식 저장소가 현재 배포하는 두 스킬 외의 추가 Supabase 스킬 설치
- 이번 정리와 무관한 공용 프로젝트 스킬의 갱신 또는 제거

## 가정

- 구현 시 확인한 npm `latest`는 Next.js와 `@next/codemod` 모두 16.3.2다.
- codemod가 제안하는 선택 중 기존 동작을 유지하는 선택을 우선한다.
- 업그레이드 전후 검증에는 현재 저장소의 테스트, 로컬 Supabase와 브라우저 환경을 사용할 수 있다.

## 보류 사항

- 없음.

## 남은 위험

- 공식 codemod가 현재 코드에서 자동 변환할 항목을 찾으면 예상보다 넓은 변경이 생길 수 있다. 각 변환은 기존 동작과 테스트 결과로 확인해야 한다.
- Next.js 16.3의 런타임 변화가 기존 테스트가 다루지 않는 경로에 영향을 줄 수 있으므로 개발 서버의 실제 브라우저 검증이 필요하다.
- Supabase의 선언형 diff 동작은 CLI 버전에 따라 바뀔 수 있으므로 migration 검토 시 공식 스킬과 현재 문서를 다시 확인해야 한다.
