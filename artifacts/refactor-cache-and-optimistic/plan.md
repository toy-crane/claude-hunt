# Refactor — Cache Layer & Optimistic UI

## Goal

두 가지 성능·일관성 문제를 함께 정리한다.

1. **캐시 계층** — `React.cache` dedup만 쓰고 있어 Supabase 쿼리가 매 요청마다 실행됨. 핵심 hot path(home, project detail)에 Data Cache 도입 + viewer 데이터 분리.
2. **Optimistic UI 패턴 통일** — `vote-button`이 props를 `useState`로 미러링하는 안티패턴 사용. `reaction-row`가 이미 `useOptimistic`을 쓰므로 거기에 맞춰 통일. 댓글 작성/수정/삭제도 optimistic UI로 보강.

## Non-goals

- 새 기능 추가 — 순수 refactor.
- DB 스키마 변경 — 없음.
- 디자인 변경 — 없음.
- E2E 시나리오 변경 — 없음 (기존 시나리오는 그대로 통과해야 함).

## Cross-cutting Concerns (영역별 작업 흔적)

각 도메인이 여러 Phase에 걸쳐 다뤄지므로, 검토 편의를 위해 영역별로 모아둠.

### Upvote (vote-button + 데이터)

| Task | 변경 |
|---|---|
| 1.2 | `useState` 미러링 안티패턴 제거 → `useOptimistic` 도입 (`reaction-row.tsx` 패턴과 통일) |
| 1.2 | `toggleVote`에 `revalidatePath(\`/projects/${projectId}\`)` 추가 (현재 `/`만 호출 — 디테일 페이지 무효화 누락) |
| 2.1 | `fetchProjectDetail` split → `fetchProjectCore` + `fetchViewerVote`. 디테일 페이지에서 로그인 사용자 DB 쿼리 2회 → 1회 |
| 2.2 | `fetchProjects` split → `fetchProjectGridCore` + `fetchViewerVotedIds`. 그리드의 vote_count는 viewer-agnostic이라 캐시 가능. |
| 2.3 | `fetchProjectGridCore`에 `'use cache'` + `cacheLife({ revalidate: 60 })`. `toggleVote`/`submit`/`edit`/`delete`는 `revalidateTag('projects-grid')` 호출. |

### Cache layer (서버 측 데이터 페치)

| Task | 변경 |
|---|---|
| 2.1 | `fetchProjectDetail` split |
| 2.2 | `fetchProjects` split |
| 2.3 | `'use cache'` + `cacheLife` 적용 (`fetchProjectGridCore`, `fetchCohorts`) + server actions의 path → tag 마이그레이션 |

### Optimistic UI

| Task | 변경 |
|---|---|
| 1.2 | Upvote: `useOptimistic` 도입 |
| 3.1 | Comment list: state hoist + `useOptimistic` reducer (add/edit/delete/reply) |
| 3.2 | Comment add: optimistic add 연결 |
| 3.3 | Comment delete: optimistic remove 연결 |
| 3.4 | Comment edit: optimistic update 연결 |

### Layout / Navigation

| Task | 변경 |
|---|---|
| 1.1 | Route group `(chrome)`으로 Header/Footer를 7개 페이지에 공통화. Settings 페이지 포함. |

## Success Criteria

| # | 조건 | 검증 |
|---|---|---|
| S1 | 로그인 사용자가 페이지 간 네비게이션해도 Header의 `fetchViewer`가 재호출되지 않음 | Next.js 빌드 로그 + Vercel Speed Insights 비교 (전후) |
| S2 | `vote-button`이 `useOptimistic`을 사용하고, props 갱신 시 자동 sync됨 | 단위 테스트 — props 변경 시 UI 반영, 실패 시 자동 롤백 |
| S3 | `fetchProjects`/`fetchProjectDetail`의 viewer-agnostic 부분이 요청 간 캐시됨 | 같은 페이지 두 번 요청 시 두 번째는 DB 쿼리 미발생 (서버 로그) |
| S4 | 댓글 작성/수정/삭제 시 사용자가 즉각적 UI 변화를 봄 | 수동 검증 + e2e: 액션 직후 frame에 변경 반영 |
| S5 | 기존 vitest, pgTAP, playwright 전부 통과 | `bun run test && bun run test:e2e` |
| S6 | TypeScript 타입 오류 0건 | `bun run typecheck` |
| S7 | 변이 후에도 데이터 일관성 유지 (vote/comment/edit/delete) | e2e가 기존대로 통과 |

## Phases & Tasks

각 Task는 **단일 logical commit** 단위. TDD: 가능하면 테스트를 먼저 또는 같이 작성.

---

### Phase 1 — Layout 재구성 & Anti-pattern 수정

**의도**: 위험 낮고 영향 큰 변경부터. 이후 Phase의 기반이 됨.

#### Task 1.1 — Route group으로 chrome 계층화

**문제**: Header/Footer가 6개 페이지에 중복 렌더됨. 클라이언트 네비게이션마다 RSC tree에 포함되어 `fetchViewer` 호출이 페이지마다 반복.

**해결**: Next.js route group `(chrome)`을 도입.

**파일 이동 (URL 영향 없음)**:
- `app/page.tsx` → `app/(chrome)/page.tsx`
- `app/privacy/page.tsx` → `app/(chrome)/privacy/page.tsx`
- `app/terms/page.tsx` → `app/(chrome)/terms/page.tsx`
- `app/settings/page.tsx` → `app/(chrome)/settings/page.tsx` (Header 추가 결정)
- `app/projects/[id]/page.tsx` → `app/(chrome)/projects/[id]/page.tsx`
- `app/projects/[id]/edit/page.tsx` → `app/(chrome)/projects/[id]/edit/page.tsx`
- `app/projects/new/page.tsx` → `app/(chrome)/projects/new/page.tsx`
- `app/projects/[id]/opengraph-image.tsx` → `app/(chrome)/projects/[id]/opengraph-image.tsx`
- `app/_components/project-board.tsx` → `app/(chrome)/_components/project-board.tsx`

**유지 (chrome 안 씀)**:
- `app/login/page.tsx` — 로그인 작업 집중, header 불필요
- `app/onboarding/page.tsx` — minimal chrome (자체 상단)
- `app/auth/auth-code-error/page.tsx` — 에러 페이지
- `app/opengraph-image.tsx` — 루트 fallback OG 유지

**Settings에 Header를 추가하는 이유**: 일반적인 SaaS 컨벤션 — 인증된 앱 셸의 일부로 다른 페이지로 돌아갈 길이 필요. 현재 누락 상태로 확인됨.

**새 파일**:
- `app/(chrome)/layout.tsx` — Header + `<main>` 래퍼 + Footer

**페이지별 변경**: 위 6개 페이지에서 `<Header />`, `<Footer />`, 그리고 layout이 제공하는 `<main className="...">`를 제거. children만 남김.

**위험 영역**:
- OG 이미지 경로 변경 — `app/(chrome)/projects/[id]/opengraph-image.tsx`가 `/projects/{id}` URL에 정상 매핑되는지 확인.
- Test 파일 path alias — `app/page.test.tsx`와 `app/__tests__/*`도 영향. 같은 이동 적용.
- import 경로 — 페이지가 사용하는 `@features/*`, `@widgets/*`는 alias라 영향 없음. 상대경로 import가 있으면 손봐야 함.

**Success criteria (Task)**:
- 6개 페이지 URL 동일 동작 (수동 확인)
- `app/(chrome)/layout.tsx`에서 `fetchViewer`가 호출되는 컴포넌트(Header)는 layout에 있고, page 내부의 `fetchViewer` 호출은 그대로 (React.cache로 중복 제거됨)
- 빌드 통과 + 기존 테스트 통과

---

#### Task 1.2 — `vote-button`을 `useOptimistic`으로 리팩토링

**문제**: `features/toggle-vote/ui/vote-button.tsx:56-58`가 props (`alreadyVoted`, `voteCount`)를 `useState`로 미러링. props 갱신 시 sync 안 되는 안티패턴.

**해결**: `reaction-row.tsx:70`의 패턴을 그대로 적용.

```ts
const [optimistic, applyOptimistic] = useOptimistic(
  { voted: alreadyVoted, count: voteCount },
  (state) => ({
    voted: !state.voted,
    count: state.count + (state.voted ? -1 : 1),
  })
);

function handleClick() {
  startTransition(async () => {
    applyOptimistic(null); // toggle
    const result = await toggleVote(projectId);
    if (!result.ok) {
      toast.error(result.error ?? "투표를 저장하지 못했어요.");
    }
  });
}
```

**파일 변경**:
- `features/toggle-vote/ui/vote-button.tsx` — 핵심 리팩토링
- `features/toggle-vote/ui/vote-button.test.tsx` — 새 동작 검증

**추가 변경**:
- `features/toggle-vote/api/actions.ts` — `revalidatePath('/')`만 호출 중. `/projects/{id}` 페이지에서도 vote가 가능하므로 `revalidatePath(\`/projects/${projectId}\`)` 추가 (대화에서 짚었던 누락 이슈). projectId 인자가 이미 있으므로 trivial.

**테스트 추가/수정**:
- props 변경 시 optimistic state가 새 props를 따라감
- 실패 시 자동 롤백 (수동 setState 코드 제거됨)
- pending 중에는 disabled

**Success criteria (Task)**:
- `useState` 미러링 제거됨
- 수동 롤백 코드 제거됨
- 기존 `vote-button.test.tsx` 통과 + 새 props-sync 케이스 추가

---

### Phase 2 — 서버 캐시 계층 분리

**의도**: viewer-agnostic 데이터와 viewer-specific 데이터를 분리해서 전자를 캐시 대상으로 만든다.

#### Task 2.1 — `fetchProjectDetail` split

**문제**: `widgets/project-detail/api/queries.ts:38`가 `(id, viewerUserId)` 단일 함수. `generateMetadata`는 `(id, null)`, `Page`는 `(id, viewerId)`로 호출 → 로그인 사용자에게 React.cache 미스 → 같은 페이지에서 DB 2번.

**해결**: 두 함수로 분리.

```ts
// 1) viewer-agnostic — id만 받음, React.cache로 dedup
export const fetchProjectCore = cache(async (id: string): Promise<ProjectCore | null> => { ... });

// 2) viewer-specific — vote 여부 체크
export const fetchViewerVote = cache(async (projectId: string, viewerUserId: string): Promise<boolean> => { ... });

// 3) wrapper (기존 시그니처 유지, 호출처 최소 변경)
export async function fetchProjectDetail(id: string, viewerUserId: string | null): Promise<ProjectDetail | null> {
  const core = await fetchProjectCore(id);
  if (!core) return null;
  const viewer_has_voted = viewerUserId ? await fetchViewerVote(id, viewerUserId) : false;
  return { ...core, viewer_has_voted };
}
```

**효과**: `generateMetadata(id, null)`와 `Page(id, viewerId)`가 둘 다 `fetchProjectCore(id)`를 호출 → 같은 인자 → React.cache 적중. DB 쿼리 1번으로 감소.

**파일 변경**:
- `widgets/project-detail/api/queries.ts` — split 적용
- `widgets/project-detail/api/queries.test.ts` (있다면 / 없으면 새로)

**Success criteria (Task)**:
- 로그인 사용자가 `/projects/{id}` 진입 시 `projects_with_vote_count` 쿼리 1번 (이전 2번)
- 호출처(`app/(chrome)/projects/[id]/page.tsx`, `app/(chrome)/projects/[id]/edit/page.tsx`, `app/(chrome)/projects/[id]/opengraph-image.tsx`) 기존 시그니처로 동작

---

#### Task 2.2 — `fetchProjects` split

**문제**: `widgets/project-grid/api/fetch-projects.ts:35`가 list 쿼리 + viewer's votes 쿼리를 한 번에 처리. list 부분은 모든 사용자에게 동일하지만 캐시 안 됨.

**해결**: 두 함수로 분리.

```ts
// 1) viewer-agnostic — Data Cache 대상
async function fetchProjectGridCore(): Promise<ProjectGridCore[]> { ... }

// 2) viewer-specific — votes overlay
async function fetchViewerVotedIds(viewerUserId: string): Promise<Set<string>> { ... }

// 3) wrapper
export async function fetchProjects(options: FetchProjectsOptions = {}): Promise<ProjectGridRow[]> {
  const [rows, votedIds] = await Promise.all([
    fetchProjectGridCore(),
    options.viewerUserId ? fetchViewerVotedIds(options.viewerUserId) : Promise.resolve(new Set<string>()),
  ]);
  return rows.map((r) => ({ ...r, viewer_has_voted: r.id ? votedIds.has(r.id) : false }));
}
```

**파일 변경**:
- `widgets/project-grid/api/fetch-projects.ts`
- `widgets/project-grid/api/fetch-projects.test.ts`

**Success criteria (Task)**:
- 홈에서 list 쿼리 + (로그인 시) votes 쿼리 = 2 쿼리. core 분리 후도 동일 (Task 2.3에서 캐시 도입).
- 기존 시그니처 호환 — `app/(chrome)/page.tsx`, `app/(chrome)/_components/project-board.tsx`는 변경 없이 동작.

---

#### Task 2.3 — `fetchProjectGridCore`와 `fetchCohorts`에 `'use cache'` 적용

**문제**: viewer-agnostic 쿼리는 모든 사용자에게 동일하지만 매 요청마다 DB 친다.

**해결**: Next 16의 `'use cache'` directive + tag 기반 무효화.

**Pre-flight 확인** (Task 시작 시 첫 단계):
- Next.js 16.1.7에서 `'use cache'`가 stable인지 확인 (`next.config.mjs`에 `experimental.useCache` 또는 `cacheComponents` 필요한지)
- Stable이 아니면 `unstable_cache`로 fallback

**적용 위치 및 cacheLife 정책**:

| 함수 | tag | cacheLife `revalidate` | 이유 |
|---|---|---|---|
| `fetchProjectGridCore` | `projects-grid` | **60초** | 변이 빈도 중간 (vote/submit/edit/delete). Tag invalidation이 주, 60초는 안전망. |
| `fetchCohorts` | `cohorts` | **3600초** | 거의 안 바뀜. 코호트 추가 시에만 tag 무효화. 1시간은 매우 긴 안전망. |

`cacheLife`는 `expire`/`stale` 기본값을 그대로 두고 `revalidate`만 명시 (가장 보수적). 두 함수 모두 background revalidate 패턴 — stale 응답은 즉시 반환, 백그라운드에서 갱신.

**Tag 설계**:
- `projects-grid` — 프로젝트 목록과 vote 집계 둘 다 영향
- `cohorts` — 코호트 변경 시

**Server actions 갱신** (path → tag 마이그레이션):
| Action | 기존 | 변경 후 |
|---|---|---|
| `toggleVote` | `revalidatePath('/')` | `revalidateTag('projects-grid')` + `revalidatePath(\`/projects/${projectId}\`)` |
| `submitProject` | `revalidatePath('/')` | `revalidateTag('projects-grid')` |
| `editProject` | `revalidatePath('/')` + `revalidatePath(\`/projects/${id}\`)` | `revalidateTag('projects-grid')` + `revalidatePath(\`/projects/${id}\`)` |
| `deleteProject` | `revalidatePath('/')` | `revalidateTag('projects-grid')` |
| `onboarding` | `revalidatePath('/')` | path는 viewer 변경 신호라 그대로. cohort 변경 없음. |

(주의: viewer-specific `votes` 쿼리는 캐시되면 안 됨 — 그래서 split이 선행되어야 한다)

**파일 변경**:
- `widgets/project-grid/api/fetch-projects.ts` — `'use cache'` 도입
- `features/cohort-filter/api/fetch-cohorts.ts` — `'use cache'` 도입
- 위 표의 server actions

**Success criteria (Task)**:
- 동일 페이지 두 번 요청 시 2번째 요청에서 `fetchProjectGridCore` DB 쿼리 미발생 (서버 로그로 확인)
- vote/edit/delete 후 다음 요청에 list가 fresh (e2e가 잡아냄)
- cohort dropdown은 anonymous든 logged-in이든 동일하게 즉시 응답

---

### Phase 3 — 댓글 Optimistic UI

**의도**: `leave-comment`, `delete-comment`, `edit-comment`가 현재 `router.refresh()` 의존. 사용자는 액션 후 latency 동안 빈/옛 UI 본다. `useOptimistic`으로 즉각적 피드백.

**선결 조건**: 댓글 목록의 상태가 currently widget-level이 아닌 RSC props로 흘러옴. optimistic UI를 위해 list state를 hoist해야 함.

#### Task 3.1 — `CommentList`에 optimistic state 도입

**현재 구조**: `widgets/comment-list/ui/comment-list.tsx`가 RSC에서 받은 `threads` props를 그대로 렌더. 자식 `CommentItem`, `CommentForm`이 각자 server action을 호출.

**새 구조**: `CommentList`를 client component로 만들고, `useOptimistic`으로 thread 배열을 관리. 자식들은 callback prop으로 optimistic dispatcher를 호출.

```ts
'use client'
type Action =
  | { type: 'add'; thread: CommentThread }
  | { type: 'reply'; parentId: string; reply: CommentRow }
  | { type: 'edit'; commentId: string; body: string }
  | { type: 'delete'; commentId: string };

const [optimisticThreads, dispatch] = useOptimistic(threads, reducer);
```

reducer는 4가지 액션을 처리. props가 갱신되면 (server revalidate 후) base가 바뀌고 reducer가 새 base로 재실행됨 — stale 자동 해소.

**파일 변경**:
- `widgets/comment-list/ui/comment-list.tsx` — Client Component로 전환, useOptimistic 도입, dispatcher를 children에 전달

**위험**:
- 현재 server-side에서 props로 받는 CommentList가 client component가 되면, viewerUserId 등 props는 그대로 props로 전달 가능. RSC 데이터 페치(`fetchCommentThreads`)는 부모(`app/(chrome)/projects/[id]/page.tsx`)가 계속 담당.
- 무거운 children(이미지 등) 없음 — 댓글은 텍스트 위주라 client component 전환 비용 작음.

---

#### Task 3.2 — `leave-comment` optimistic add

`CommentForm`이 submit 시 dispatcher 호출 → 즉시 새 thread/reply가 리스트에 등장.

**파일 변경**:
- `features/leave-comment/ui/comment-form.tsx` — optional `onOptimisticAdd` prop 받음, submit 핸들러에서 호출
- `widgets/comment-list/ui/comment-list.tsx` — 자식에 dispatcher 전달
- (테스트) — optimistic add 시나리오

---

#### Task 3.3 — `delete-comment` optimistic remove

`CommentItem`의 confirm delete 시 dispatcher 호출 → 즉시 사라짐. 실패 시 자동 복귀 + 토스트.

**파일 변경**:
- `widgets/comment-list/ui/comment-item.tsx` — dispatcher 호출, `router.refresh()` 제거 (use cache로 server는 갱신됨)

---

#### Task 3.4 — `edit-comment` optimistic update

`EditCommentInline`의 save 시 dispatcher 호출 → 즉시 새 본문 반영.

**파일 변경**:
- `features/edit-comment/ui/edit-comment-inline.tsx` — dispatcher prop 받음
- `widgets/comment-list/ui/comment-item.tsx` — dispatcher를 EditCommentInline에 전달

---

### Phase 4 — Verification

#### Task 4.1 — 풀 테스트 스윕

```bash
bun run typecheck   # S6
bun run test        # vitest + pgTAP — S2, S5
bun run test:e2e    # playwright — S4, S7
```

테스트 실패가 있으면 그 자리에서 디버그. 새 동작에 맞게 기존 어설션 갱신이 필요한 경우, **테스트 의도가 무엇이었는지** 먼저 파악 후 어설션 갱신 (블라인드 갱신 금지).

#### Task 4.2 — 수동 dev server walkthrough

```bash
bun run dev
```

체크리스트:
- [ ] 홈 → 프로젝트 디테일 네비 시 Header가 깜빡이지 않음 (S1)
- [ ] vote 토글: 즉시 카운트 변화, 새로고침 후 일관성, 실패 시뮬레이션 시 롤백 (S2)
- [ ] 댓글 작성: form 클릭 후 즉시 목록에 등장 (S4)
- [ ] 댓글 수정: 저장 후 즉시 새 본문 (S4)
- [ ] 댓글 삭제: confirm 후 즉시 사라짐 (S4)
- [ ] cohort 필터: 응답 즉각적

## Sequencing & Dependencies

```
Phase 1.1 (Layout) ──┐
                     ├─→ Phase 4 (Verify)
Phase 1.2 (Vote UI) ─┤
                     │
Phase 2.1 (Detail split) ──┐
Phase 2.2 (Grid split) ────┼─→ Phase 2.3 (use cache + tags) ──┐
                           │                                    │
Phase 3.1 (List state)─────┼─→ Phase 3.2 (Add) ────────────────┤
                           ├─→ Phase 3.3 (Delete) ──────────────┤
                           └─→ Phase 3.4 (Edit) ────────────────┘
                                                                ↓
                                                           Phase 4 (Verify)
```

- 1.1과 1.2는 독립 — 병렬 가능.
- 2.1, 2.2는 독립 split. 둘 다 끝나야 2.3 (use cache + tag-based revalidate) 가능.
- 3.1이 3.2/3.3/3.4의 선결조건.
- Phase 4는 모든 Phase 끝난 후.

## Risk Register

| 위험 | 영향 | 완화 |
|---|---|---|
| `'use cache'`가 Next 16.1.7에서 unstable | 캐시 미동작 | `unstable_cache`로 fallback. Task 2.3 시작 시 확인. |
| Route group 이동 시 OG 이미지 경로 변경으로 매핑 깨짐 | OG 안 보임 | dev server에서 `/<id>/twitter-image` 등 메타 URL 직접 확인. |
| Comment optimistic UI의 reducer가 복잡 → 버그 | 사용자에게 잘못된 상태 노출 | 4가지 액션 각각 단위 테스트. props 변경 시 base sync 확인. |
| useOptimistic이 transition pending 중에만 동작 → 빠른 연속 클릭 시 race | UX 혼란 | `useTransition`의 `isPending`으로 추가 클릭 disabled (이미 reaction-row가 함). |
| Header를 layout에 두면 settings/login 페이지에서 안 보이는데 사용자가 이상하게 느낌 | UX 격차 | 현재도 settings는 header 없음. 의도 확인 필요 — 별도 task로 분리 가능. |

## Open Questions — Resolved

1. ~~**settings page에 Header를 도입할지**~~ → **추가하기로 결정.** 일반 SaaS 컨벤션 + 사용자 확인.
2. ~~**'use cache'의 revalidate 주기**~~ → **추가하기로 결정.** `projects-grid: 60s`, `cohorts: 3600s`.
3. ~~**댓글 optimistic UI에서 작성자 표시**~~ → **viewer props로 전달하는 방식 확정.**
