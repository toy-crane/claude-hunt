-- docs 사이트(claude-code-playbook) 랜딩 구독 폼이 쓰는 테이블.
-- 서버 전용(service_role)으로만 접근하므로 RLS 정책과 anon/authenticated 권한이 없다.
create table public.subscribers (
  id uuid not null default gen_random_uuid() primary key,
  email text not null,
  source text not null default 'landing',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscribers_email_unique on public.subscribers (lower(email));

alter table public.subscribers enable row level security;

revoke all on table public.subscribers from anon, authenticated;

create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at
  before update on public.subscribers
  for each row
  execute procedure extensions.moddatetime (updated_at);
