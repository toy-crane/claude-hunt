-- Corrects `display_order` for cohorts that predate the column, then hands the
-- sequence back to identity for every future insert.
--
-- DML, so `supabase db diff` cannot capture it — hence the manual path.
--
-- Adding the identity column filled existing rows in physical row order, which
-- has nothing to do with class order. Every pre-existing class is named
-- "LGE-<n>" where <n> is both the class number and its chronological rank, so
-- the name carries the order we want for this one-time correction. Runtime
-- code never parses `name` — after this migration the column is authoritative.
update public.cohorts
set display_order = (substring(name from '^LGE-([0-9]+)$'))::int
where name ~ '^LGE-[0-9]+$';

-- toycrane is not a class. Its value is never read (entities/cohort pins it to
-- the bottom by name), but parking it below every class keeps the column
-- readable and stops it from colliding with a real class number.
update public.cohorts
set display_order = 0
where name = 'TOYCRANE';

-- Resume identity above the highest value in use, so the next class inserted
-- without an explicit value outranks every existing one. `is_called => false`
-- makes the next `nextval` return exactly this number; `coalesce` keeps the
-- statement valid on a fresh database where seed data has not loaded yet.
select setval(
  pg_get_serial_sequence('public.cohorts', 'display_order'),
  (select coalesce(max(display_order), 0) + 1 from public.cohorts),
  false
);
