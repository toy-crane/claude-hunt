-- pgTAP tests for the cohorts table:
--   schema shape (id / name unique / created_at)
--   RLS: anon + authenticated can select
--   No write policies (admin-only via migration)

BEGIN;
SELECT plan(9);

-- 1. Table exists
SELECT has_table('public', 'cohorts', 'cohorts table should exist');

-- 2-4. Columns
SELECT has_column('public', 'cohorts', 'id', 'cohorts should have id column');
SELECT has_column('public', 'cohorts', 'name', 'cohorts should have name column');
SELECT has_column('public', 'cohorts', 'created_at', 'cohorts should have created_at column');

-- 5. RLS is enabled
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cohorts'),
  true,
  'RLS should be enabled on cohorts'
);

-- 6. Seed migration inserted at least 2 rows visible to anon
SET local role anon;
SELECT cmp_ok(
  (SELECT count(*)::int FROM cohorts),
  '>=',
  2,
  'Anon can see at least two seeded cohorts'
);

-- 7. Authenticated can also see cohorts
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
  '>=',
  2,
  'Authenticated user can see cohorts'
);

-- 8. Unique constraint on name
RESET role;
SELECT throws_ok(
  $$INSERT INTO public.cohorts (name)
    SELECT name FROM public.cohorts LIMIT 1$$,
  '23505',
  NULL,
  'Duplicate cohort name should violate the unique constraint'
);

-- 9. Anon cannot insert cohorts (no write policy defined)
SET local role anon;
SELECT throws_ok(
  $$INSERT INTO public.cohorts (name) VALUES ('Anon Cohort')$$,
  '42501',
  NULL,
  'Anon cannot insert cohorts'
);

SELECT * FROM finish();
ROLLBACK;
