-- pgTAP tests for the cohorts table:
--   schema shape (id / name unique / label / created_at / updated_at)
--   RLS: anon + authenticated can select
--   Seed contract: the four (name, label) pairs defined in supabase/seed.sql
--   No write policies (admin-only via seed)

BEGIN;
SELECT plan(11);

-- 1. Table exists
SELECT has_table('public', 'cohorts', 'cohorts table should exist');

-- 2-5. Columns (including new label + updated_at)
SELECT has_column('public', 'cohorts', 'id', 'cohorts should have id column');
SELECT has_column('public', 'cohorts', 'name', 'cohorts should have name column');
SELECT has_column('public', 'cohorts', 'label', 'cohorts should have label column');
SELECT has_column('public', 'cohorts', 'updated_at', 'cohorts should have updated_at column');

-- 6. RLS is enabled
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cohorts'),
  true,
  'RLS should be enabled on cohorts'
);

-- 7. Seed contract: exactly the four (name, label) pairs from supabase/seed.sql
SET local role anon;
SELECT results_eq(
  $$SELECT name, label FROM public.cohorts ORDER BY name$$,
  $$VALUES
    ('Inflearn'::text, '인프런'::text),
    ('LGE-1'::text,    'LG전자 1기'::text),
    ('LGE-2'::text,    'LG전자 2기'::text),
    ('LGE-3'::text,    'LG전자 3기'::text)$$,
  'Anon sees exactly the four seeded (name, label) cohort pairs'
);

-- 8. Authenticated can also see cohorts
RESET role;
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-0000000c0001',
  'cohort-viewer@example.com',
  '{"full_name": "Cohort Viewer"}'::jsonb,
  '{"provider": "email"}'::jsonb,
  'authenticated',
  'authenticated',
  '00000000-0000-0000-0000-000000000000',
  now(),
  now()
);

SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-0000000c0001"}';

SELECT cmp_ok(
  (SELECT count(*)::int FROM cohorts),
  '=',
  4,
  'Authenticated user sees exactly the four seeded cohorts'
);

-- 9. Unique constraint on name
RESET role;
SELECT throws_ok(
  $$INSERT INTO public.cohorts (name, label)
    SELECT name, label FROM public.cohorts LIMIT 1$$,
  '23505',
  NULL,
  'Duplicate cohort name should violate the unique constraint'
);

-- 10. Anon cannot insert cohorts (no write policy defined)
SET local role anon;
SELECT throws_ok(
  $$INSERT INTO public.cohorts (name, label) VALUES ('Anon Cohort', 'Anon Label')$$,
  '42501',
  NULL,
  'Anon cannot insert cohorts'
);

-- 11. moddatetime trigger updates updated_at on row update
RESET role;
DO $$
DECLARE
  before_ts timestamptz;
  after_ts  timestamptz;
BEGIN
  SELECT updated_at INTO before_ts FROM public.cohorts WHERE name = 'LGE-1';
  PERFORM pg_sleep(0.05);
  UPDATE public.cohorts SET label = label WHERE name = 'LGE-1';
  SELECT updated_at INTO after_ts  FROM public.cohorts WHERE name = 'LGE-1';
  IF after_ts <= before_ts THEN
    RAISE EXCEPTION 'updated_at was not advanced by the moddatetime trigger (before=%, after=%)', before_ts, after_ts;
  END IF;
END$$;
SELECT pass('moddatetime trigger advances updated_at on row update');

SELECT * FROM finish();
ROLLBACK;
