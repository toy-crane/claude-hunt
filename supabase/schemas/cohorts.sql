-- `created_at` is not only an audit column here: it is the class filter's sort
-- key (newest class first, see entities/cohort/model/order.ts). Two consequences
-- for anyone adding a cohort:
--
--   * Insert one class per statement and the default is right — the row is
--     written when the class opens, so it lands at the top of the filter.
--   * Inserting several at once does NOT work. `now()` is the transaction
--     timestamp, so every row in one transaction shares a value and the classes
--     tie; the filter then falls back to `name`, which says nothing about which
--     class is newer. Spell `created_at` out when seeding or backfilling more
--     than one row (supabase/seed.sql does).
--
-- `name` is the stable slug used by lookups and by the pinning rules in
-- entities/cohort; `label` is display copy and may change freely.
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
