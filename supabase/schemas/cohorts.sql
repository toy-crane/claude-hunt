-- `display_order` drives the user-facing cohort order (filter dropdown,
-- onboarding, settings). It exists because neither of the alternatives
-- works: `name` sorts lexicographically, so "LGE-10" lands between "LGE-1"
-- and "LGE-2"; and `created_at` is unreliable, because cohorts were
-- backfilled in batches (LGE-2 and LGE-3 share a timestamp, and LGE-1 was
-- inserted a month after both). Higher = newer. The operator-only TOYCRANE
-- cohort keeps 0 so it sorts last under `order by display_order desc`.
create table public.cohorts (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  label text not null,
  display_order int not null default 0,
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
