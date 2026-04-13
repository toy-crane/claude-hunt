-- pgTAP tests for the profiles table:
--   auto-creation + metadata fallbacks (tests #13-18)
--   RLS select own / block others        (tests #10-11)
--   RLS update own / block others        (tests #19-20)

BEGIN;
SELECT plan(20);

-- 1. Table exists
SELECT has_table('public', 'profiles', 'profiles table should exist');

-- 2-6. Columns exist
SELECT has_column('public', 'profiles', 'id', 'profiles should have id column');
SELECT has_column('public', 'profiles', 'email', 'profiles should have email column');
SELECT has_column('public', 'profiles', 'full_name', 'profiles should have full_name column');
SELECT has_column('public', 'profiles', 'display_name', 'profiles should have display_name column');
SELECT has_column('public', 'profiles', 'avatar_url', 'profiles should have avatar_url column');

-- 7. RLS is enabled
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
  true,
  'RLS should be enabled on profiles'
);

-- 8. Trigger function exists
SELECT has_function('public', 'handle_new_user', 'handle_new_user function should exist');

-- 9. Trigger exists on auth.users
SELECT has_trigger('auth', 'users', 'on_auth_user_created', 'trigger should exist on auth.users');

-- Seed user for RLS tests
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'rls-test@example.com',
  '{"full_name": "RLS Test User"}'::jsonb,
  '{"provider": "email"}'::jsonb,
  'authenticated',
  'authenticated',
  '00000000-0000-0000-0000-000000000000',
  now(),
  now()
);

-- 10-11. RLS: authenticated user can see only their own profile
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT results_eq(
  'SELECT count(*)::int FROM profiles WHERE id != ''00000000-0000-0000-0000-000000000001''::uuid',
  ARRAY[0],
  'Authenticated user cannot see other profiles'
);

-- 11. RLS: authenticated user can see own profile
SELECT results_eq(
  'SELECT count(*)::int FROM profiles WHERE id = ''00000000-0000-0000-0000-000000000001''::uuid',
  ARRAY[1],
  'Authenticated user can see their own profile'
);

-- 12. RLS: anon cannot see profiles
SET local role anon;
SELECT results_eq(
  'SELECT count(*)::int FROM profiles',
  ARRAY[0],
  'Anonymous user cannot see any profiles'
);

-- 13-14. Trigger auto-creates profile with full_name metadata
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

SELECT results_eq(
  $$SELECT display_name FROM profiles WHERE id = '00000000-0000-0000-0000-000000000099'$$,
  ARRAY['Test User'::text],
  'Trigger should create profile with display_name = full_name'
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
