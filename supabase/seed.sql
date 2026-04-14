-- Seed cohort rows for local development.
-- `supabase/config.toml` loads this file after migrations on `supabase db reset`.
-- `ON CONFLICT (name) DO NOTHING` keeps re-runs idempotent.

insert into public.cohorts (name, label) values
  ('LGE-1',    'LG전자 1기'),
  ('LGE-2',    'LG전자 2기'),
  ('LGE-3',    'LG전자 3기'),
  ('Inflearn', '인프런')
on conflict (name) do nothing;
