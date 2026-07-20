create table public.cohorts (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cohorts enable row level security;

create policy "Anyone can view cohorts"
  on public.cohorts for select
  to anon, authenticated
  using (true);

create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at
  before update on public.cohorts
  for each row
  execute procedure extensions.moddatetime (updated_at);
