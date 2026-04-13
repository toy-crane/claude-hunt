-- Seed initial cohorts. Cohort names are placeholders — adjust as needed
-- for actual course branding (e.g. "Claude Code Spring 2026").
-- Uses ON CONFLICT so re-running is idempotent.

insert into public.cohorts (name)
values ('Cohort A'), ('Cohort B')
on conflict (name) do nothing;
