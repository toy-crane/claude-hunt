-- Corrects two cohort rows whose `created_at` does not reflect when the class
-- ran. The class filter sorts by this column (newest first), so a wrong value
-- is a wrong order on screen.
--
-- DML, so `supabase db diff` cannot capture it — hence the manual path.
--
-- Two rows are wrong in production:
--
--   LGE-1  2026-05-11  written a month AFTER LGE-2 and LGE-3, so 1기 sorted
--                      above 3기. Moved before LGE-2.
--   LGE-3  2026-04-14 06:00:52.821638  byte-identical to LGE-2, because both
--                      were inserted by one statement and `now()` is the
--                      transaction timestamp. A tie leaves their relative
--                      order undefined. Moved two seconds later.
--
-- Every other row already sorts correctly and is left alone. TOYCRANE is not
-- touched either: it is pinned last by name (see entities/cohort), so its
-- timestamp never reaches the comparison.
--
-- Matched on `name`, the stable slug. Idempotent: re-running writes the same
-- values. `updated_at` moves via the moddatetime trigger, which is accurate —
-- these rows really are being updated now.
update public.cohorts
set created_at = '2026-04-14 06:00:50+00'
where name = 'LGE-1';

update public.cohorts
set created_at = '2026-04-14 06:00:54+00'
where name = 'LGE-3';
