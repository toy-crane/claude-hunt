-- pgTAP tests for the profiles table:
--   auto-creation + metadata fallbacks (tests #14-19)
--   RLS: authenticated can see ALL profiles (for card author names)
--   RLS: anon cannot see profiles         (tests #12-13)
--   RLS update own / block others         (tests #20-21)
--   display_name is NOT auto-populated by the trigger — set exclusively
--   by the onboarding flow (feat/onboarding-process)

BEGIN;
SELECT plan(22);

-- 1. Table exists
SELECT has_table('public', 'profiles', 'profiles table should exist');

-- 2-7. Columns exist (including new cohort_id FK)
SELECT has_column('public', 'profiles', 'id', 'profiles should have id column');
SELECT has_column('public', 'profiles', 'email', 'profiles should have email column');
SELECT has_column('public', 'profiles', 'full_name', 'profiles should have full_name column');
SELECT has_column('public', 'profiles', 'display_name', 'profiles should have display_name column');
SELECT has_column('public', 'profiles', 'avatar_url', 'profiles should have avatar_url column');
SELECT has_column('public', 'profiles', 'cohort_id', 'profiles should have cohort_id column');

-- 8. RLS is enabled
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
  true,
  'RLS should be enabled on profiles'
);

-- 9. Trigger function exists
SELECT has_function('public', 'handle_new_user', 'handle_new_user function should exist');

-- 10. Trigger exists on auth.users
SELECT has_trigger('auth', 'users', 'on_auth_user_created', 'trigger should exist on auth.users');

-- Seed two users for RLS tests
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001',
    'rls-test@example.com',
    '{"full_name": "RLS Test User"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(),
    now()
  ),
  ('00000000-0000-0000-0000-000000000002',
    'rls-other@example.com',
    '{"full_name": "Other User"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(),
    now()
  );

-- 11-12. RLS: authenticated user can see ALL profiles (needed for card author names)
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT results_eq(
  'SELECT count(*)::int FROM profiles WHERE id = ''00000000-0000-0000-0000-000000000001''::uuid',
  ARRAY[1],
  'Authenticated user can see their own profile'
);

SELECT cmp_ok(
  (SELECT count(*)::int FROM profiles WHERE id = '00000000-0000-0000-0000-000000000002'::uuid),
  '=',
  1,
  'Authenticated user can see other profiles (for card author names)'
);

-- 13. RLS: anon cannot see profiles
SET local role anon;
SELECT results_eq(
  'SELECT count(*)::int FROM profiles',
  ARRAY[0],
  'Anonymous user cannot see any profiles directly'
);

-- 14-15. Trigger auto-creates profile with full_name metadata
RESET role;
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000099',
      'test@example.com',
      '{"full_name": "Test User", "avatar_url": "https://example.com/avatar.png"}'::jsonb,
      '{"provider": "google"}'::jsonb,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000',
      now(),
      now()
    )$$,
  'Inserting into auth.users should succeed'
);

SELECT is(
  (SELECT display_name FROM profiles WHERE id = '00000000-0000-0000-0000-000000000099'),
  NULL,
  'Trigger should NOT populate display_name — onboarding is the sole writer'
);

SELECT results_eq(
  $$SELECT full_name FROM profiles WHERE id = '00000000-0000-0000-0000-000000000099'$$,
  ARRAY['Test User'::text],
  'Trigger should still populate full_name from OAuth full_name metadata'
);

-- 15-16. Trigger fallback to 'name' metadata key
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000098',
      'name-fallback@example.com',
      '{"name": "Jane Doe"}'::jsonb,
      '{"provider": "github"}'::jsonb,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000',
      now(),
      now()
    )$$,
  'Insert user with name metadata should succeed'
);

SELECT results_eq(
  $$SELECT full_name FROM profiles WHERE id = '00000000-0000-0000-0000-000000000098'$$,
  ARRAY['Jane Doe'::text],
  'Trigger should fallback to name metadata key'
);

-- 17-18. Trigger fallback to 'user_name' metadata key
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000097',
      'username-fallback@example.com',
      '{"user_name": "janedoe"}'::jsonb,
      '{"provider": "github"}'::jsonb,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000',
      now(),
      now()
    )$$,
  'Insert user with user_name metadata should succeed'
);

SELECT results_eq(
  $$SELECT full_name FROM profiles WHERE id = '00000000-0000-0000-0000-000000000097'$$,
  ARRAY['janedoe'::text],
  'Trigger should fallback to user_name metadata key'
);

-- 19. Authenticated user can update own profile
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT lives_ok(
  $$UPDATE profiles SET display_name = 'New Name' WHERE id = '00000000-0000-0000-0000-000000000001'$$,
  'Authenticated user can update own profile'
);

-- 20. Authenticated user cannot update other user's profile
SELECT results_eq(
  $$WITH updated AS (
    UPDATE profiles SET display_name = 'Hacked' WHERE id = '00000000-0000-0000-0000-000000000099'
    RETURNING id
  ) SELECT count(*)::int FROM updated$$,
  ARRAY[0],
  'Authenticated user cannot update other profiles'
);

SELECT * FROM finish();
ROLLBACK;
