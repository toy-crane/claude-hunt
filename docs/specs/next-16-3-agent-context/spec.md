# Next.js 16.3 업그레이드와 공식 에이전트 컨텍스트

## 목적

Claude Hunt를 최신 안정 Next.js로 올리고, 더 이상 유지되지 않거나 이 프로젝트에서 별도로 만든 Next.js·Supabase 스킬을 공식 컨텍스트로 교체한다. 이후 Next.js와 Supabase 관련 작업은 각 벤더가 현재 유지하는 공식 문서, 공식 에이전트 지침, 공식 스킬만 사용한다.

## 기대 결과

- 애플리케이션은 Next.js 16.3.2에서 기존 기능과 화면 동작을 유지한다.
- Next.js 작업을 맡은 에이전트는 기억이나 갱신이 중단된 참고 스킬보다 설치된 Next.js 패키지의 버전 일치 문서를 먼저 사용한다.
- Codex와 Claude Code 모두 Next.js 공식 `next-dev-loop`로 개발 서버의 컴파일 상태, 런타임 오류, 브라우저 동작, React 동작을 교차 검증할 수 있다.
- Codex와 Claude Code 모두 Supabase 공식 `supabase`와 `supabase-postgres-best-practices`를 같은 원본에서 사용한다.
- Next.js 및 Supabase 관련 스킬 목록에는 더 이상 로컬 사본이나 유지가 중단된 스킬이 노출되지 않는다.

## 승인된 범위

- Next.js 16.1.7을 현재 최신 안정판인 16.3.2로 올린다.
- 업그레이드는 Next.js가 제공하는 공식 업그레이드 codemod를 사용한다.
- React, React DOM과 관련 타입 패키지는 공식 codemod가 Next.js 16.3.2 호환을 위해 요구하는 범위에서 함께 정렬한다.
- Next.js가 더 이상 유지하지 않는 `next-best-practices`를 제거한다.
- 프로젝트에서 별도로 만들었던 `nextjs` 스킬을 제거한다.
- 프로젝트에서 별도로 만들었던 `supabase` 스킬을 제거하고 Supabase 공식 저장소가 배포하는 같은 이름의 스킬로 교체한다.
- 기존 `supabase-postgres-best-practices`는 Supabase 공식 저장소의 최신 원본으로 설치한다.
- 제거된 스킬을 가리키는 에이전트 설정과 잠금 정보도 함께 정리해 존재하지 않는 스킬을 요청하지 않게 한다.
- Next.js 공식 저장소가 배포하는 `next-dev-loop`만 Next.js 워크플로 스킬로 설치한다.
- Supabase 공식 저장소가 현재 배포하는 `supabase`와 `supabase-postgres-best-practices`를 Supabase 스킬로 설치한다.
- 공식 Next.js와 Supabase 스킬은 Codex와 Claude Code가 같은 원본을 읽는 공통 구조로 관리한다.
- Next.js 16.3이 제공하는 공식 에이전트 지침을 추가해, 에이전트가 설치 패키지에 포함된 버전 일치 문서를 읽게 한다.
- 기존 프로젝트 지침과 Next.js가 관리하는 지침의 소유 경계를 유지해 이후 Next.js 업데이트가 프로젝트 고유 지침을 덮어쓰지 않게 한다.

## 수용 기준

- 설치된 `next` 버전이 16.3.2이고 의존성 잠금 상태와 일치한다.
- 타입 검사, 단위 테스트, 정적 검사, 프로덕션 빌드가 모두 통과한다.
- 기존 애플리케이션 경로와 주요 사용자 흐름이 업그레이드 전과 동일하게 동작한다.
- `next-best-practices`와 프로젝트 전용 `nextjs`가 더 이상 설치된 스킬로 발견되지 않는다.
- `supabase`와 `supabase-postgres-best-practices`의 출처가 `supabase/agent-skills` 공식 저장소로 기록된다.
- 에이전트와 보조 에이전트 설정 어디에도 제거된 스킬 이름이나 그 사용 지침이 남지 않는다.
- `next-dev-loop`의 출처가 `vercel/next.js` 공식 저장소로 기록되고 Codex와 Claude Code 양쪽에서 같은 내용을 읽는다.
- 두 Supabase 공식 스킬을 Codex와 Claude Code 양쪽에서 같은 내용으로 발견할 수 있다.
- 공식 Next.js 에이전트 지침이 활성화되어 Next.js 작업 전에 설치 패키지의 번들 문서를 사용하도록 안내한다.
- 기존 프로젝트 지침은 그대로 유지되고, Next.js가 관리하는 지침만 명확히 구분된다.
- Turbopack 개발 서버에서 `next-dev-loop` 사전 점검이 컴파일 진단과 경로 조회 기능을 확인한다.
- 설치된 `agent-browser` 0.34.0을 사용한 브라우저 및 React 검증이 실행 가능한 상태다.

## 제약과 근거

- 안정판만 사용한다. Canary 기능은 이번 업그레이드 범위가 아니다.
- `next-best-practices`의 참고 지식은 Next.js 16.3부터 패키지에 번들된 버전 일치 문서와 공식 에이전트 지침이 대신하므로 별도 사본을 유지하지 않는다.
- `next-dev-loop`는 Next.js 16.3 이상, Turbopack, `agent-browser` 0.31.1 이상을 전제로 한다. 현재 개발 명령과 설치된 브라우저 도구는 이 조건을 충족한다.
- Supabase 공식 저장소가 현재 배포하는 두 스킬은 `supabase`와 `supabase-postgres-best-practices`다. 프로젝트 전용 `supabase` 지침은 공식 `supabase` 스킬로 대체한다.
- “공식 스킬만”은 이번 요청의 Next.js·Supabase 관련 스킬 정리를 뜻한다. 제품 개발 흐름과 디자인 등 다른 목적의 프로젝트 스킬은 건드리지 않는다.
- Supabase 의존성과 애플리케이션 기능은 유지한다. 제거 대상은 프로젝트 전용 에이전트 지침이며, 공식 Supabase 스킬은 유지한다.

## 가정

- Next.js 16.3.2가 구현 시점에도 최신 안정판이다. 더 높은 안정판이 배포되면 무조건 따라가지 않고 이 스펙의 목표 버전을 다시 확인한다.
- codemod가 제안하는 선택 중 기존 동작을 유지하는 선택을 우선한다.
- 업그레이드 전후 검증에는 현재 저장소의 기존 테스트와 빌드 환경을 사용할 수 있다.

## 범위 밖

- Cache Components, Partial Prefetching 또는 다른 Next.js 16.3 기능의 신규 도입
- 애플리케이션 UI, 도메인 동작, 데이터베이스 스키마 변경
- Supabase 패키지, 로컬 개발 환경 또는 데이터베이스 워크플로 제거
- Next.js 공식 저장소의 다른 선택형 스킬 설치
- Supabase 공식 저장소가 현재 배포하는 두 스킬 외의 비공식 Supabase 스킬 설치
- 이번 정리와 무관한 프로젝트 스킬의 갱신 또는 제거

## 보류 사항

- 없음.

## 남은 위험

- 공식 codemod가 현재 코드에서 자동 변환할 항목을 찾으면 예상보다 넓은 변경이 생길 수 있다. 각 변환은 기존 동작과 테스트 결과로 확인해야 한다.
- Next.js 16.3의 런타임 변화가 기존 테스트가 다루지 않는 경로에 영향을 줄 수 있으므로 개발 서버의 실제 브라우저 검증이 필요하다.
