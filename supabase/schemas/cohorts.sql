create table public.cohorts (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.cohorts enable row level security;

create policy "Anyone can view cohorts"
  on public.cohorts for select
  to anon, authenticated
  using (true);
