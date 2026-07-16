-- Backfill `display_order` for cohorts that predate the column.
--
-- DML, so `supabase db diff` cannot capture it — hence the manual path.
--
-- Every existing cohort is named "LGE-<n>", where <n> is both the class
-- number and its chronological rank, so the name carries the order we want.
-- The operator-only TOYCRANE cohort matches no pattern and keeps the column
-- default of 0, which sorts it last under `order by display_order desc`.
--
-- Idempotent: re-running recomputes the same value from `name`.
update public.cohorts
set display_order = (substring(name from '^LGE-([0-9]+)$'))::int
where name ~ '^LGE-[0-9]+$';
