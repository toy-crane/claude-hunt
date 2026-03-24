---
title: "Supabase Profiles 테이블 설계 원칙"
date: 2026-03-24
category: database-issues
tags: [supabase, postgresql, auth, schema-design]
severity: medium
---

## Problem

Supabase에서 사용자 프로필 테이블을 설계할 때, auth.users 테이블에 이미 있는 필드를 중복 저장할지, 어떤 필드를 profiles에 넣을지 판단이 필요.

## Root Cause

auth.users 테이블은 Supabase가 관리하는 내부 스키마로, auto-generated API로 직접 노출되지 않음. 따라서 앱에서 사용할 사용자 데이터는 public 스키마에 별도 테이블이 필요.

## Solution

### auth.users에서 이미 제공하는 필드
| 필드 | 접근 방법 |
|------|-----------|
| email | `auth.users.email` |
| provider | `raw_app_meta_data->>'provider'` |
| created_at | `auth.users.created_at` |
| full_name | `raw_user_meta_data->>'full_name'` |
| avatar_url | `raw_user_meta_data->>'avatar_url'` |

### 설계 원칙
1. **사용자가 수정 가능한 필드만 profiles에 저장** (Supabase 공식 권장)
2. **관리 편의를 위해 email은 denormalization으로 포함** (매번 auth join 방지)
3. **실명(full_name)과 표시 이름(display_name) 분리** — 초기값은 동일

### 최종 스키마
```sql
create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  email text,              -- denormalization (관리 편의)
  full_name text,          -- OAuth 원본 실명
  display_name text,       -- 앱 표시 이름 (사용자 수정 가능)
  avatar_url text,
  updated_at timestamptz default now() not null
);
```

### Trigger로 자동 생성
- auth.users INSERT 시 profiles 자동 생성
- `display_name` 초기값 = `full_name` (사용자가 나중에 수정 가능)
- trigger에서 `security definer set search_path = ''` 사용 (보안)

### Declarative Schema 주의사항
- 테이블/RLS는 `supabase/schemas/*.sql`에 선언적으로 정의
- auth.users에 걸리는 trigger는 `supabase db diff`로 캡처 불가 → 별도 수동 migration 필요

### 127.0.0.1 vs localhost
OAuth redirect URL에 `localhost` 대신 `127.0.0.1` 사용. `localhost`는 IPv4/IPv6 해석이 시스템마다 달라 redirect URL 불일치 발생 가능.

## Prevention

- profiles 설계 시 auth.users 필드 먼저 확인하여 불필요한 중복 방지
- trigger가 auth 스키마에 걸리는 경우 반드시 수동 migration으로 분리
- OAuth 로컬 개발 시 항상 `127.0.0.1` 사용

## Related Files

- `supabase/schemas/profiles.sql` — Declarative schema
- `supabase/migrations/*_create_profiles.sql` — Auto-generated migration
- `supabase/migrations/*_create_profile_trigger.sql` — Manual trigger migration
- `supabase/tests/profiles_test.sql` — pgTAP tests
- `supabase/config.toml` — Auth provider config
