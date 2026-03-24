---
title: "Next.js 16 + Supabase SSR 통합 패턴"
date: 2026-03-24
category: architecture
tags: [next.js, supabase, ssr, auth, proxy]
severity: high
---

## Problem

Next.js 16에서 Supabase SSR 클라이언트를 설정할 때, 기존 문서/튜토리얼이 Next.js 15 이하 기준으로 작성되어 있어 여러 부분이 맞지 않음.

## Root Cause

Next.js 16에서 3가지 주요 변경이 발생:

1. **`middleware.ts` → `proxy.ts`**: middleware가 deprecated되고 proxy로 rename됨. 함수명도 `middleware()` → `proxy()`
2. **`cookies()` async**: Next.js 15+부터 `cookies()`가 async 함수로 변경 → `await cookies()` 필요
3. **Supabase 환경변수 네이밍**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

추가로, Supabase Auth 보안 패턴도 변경:
- **`getClaims()`** — 서버 코드에서 `getSession()` 대신 사용. JWT 서명을 검증하여 토큰 위조 방지

## Solution

### 파일 구조
```
lib/supabase/
├── client.ts       # createBrowserClient (클라이언트 컴포넌트용)
├── server.ts       # createServerClient + await cookies() (서버 컴포넌트용)
└── proxy.ts        # updateSession with getClaims() (세션 갱신)
proxy.ts             # Root proxy (export function proxy)
app/auth/callback/
└── route.ts        # OAuth code exchange
```

### 핵심 코드 패턴

**proxy.ts** (Next.js 16):
```typescript
export function proxy(request: NextRequest) {  // middleware → proxy
  return updateSession(request)
}
```

**lib/supabase/proxy.ts** — `getClaims()` 사용:
```typescript
const { data } = await supabase.auth.getClaims()  // getSession() 대신
if (!(data?.claims || request.nextUrl.pathname.startsWith("/auth"))) {
  return NextResponse.redirect(url)
}
```

**lib/supabase/server.ts** — `await cookies()`:
```typescript
const cookieStore = await cookies()  // async 필수
```

### non-null assertion 대신 fallback
Biome `noNonNullAssertion` 룰 때문에 `process.env.X!` 대신 `process.env.X ?? ""` 사용.

## Prevention

- Next.js 메이저 버전 업그레이드 시 반드시 공식 문서의 breaking changes 확인
- `middleware.ts`가 보이면 `proxy.ts`로 전환 필요 여부 확인
- 서버 코드에서 `getSession()` 사용 시 → `getClaims()`로 교체 검토

## Related Files

- `proxy.ts` — Root proxy (Next.js 16)
- `lib/supabase/client.ts` — Browser client
- `lib/supabase/server.ts` — Server client
- `lib/supabase/proxy.ts` — Session refresh logic
- `app/auth/callback/route.ts` — OAuth callback
