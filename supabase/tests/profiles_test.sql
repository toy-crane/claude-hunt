BEGIN;
SELECT plan(13);

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

-- 10-11. RLS: authenticated user can see only their own profile
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT results_eq(
  'SELECT count(*)::int FROM profiles WHERE id != ''00000000-0000-0000-0000-000000000001''::uuid',
  ARRAY[0],
  'Authenticated user cannot see other profiles'
);

-- 11. RLS: anon cannot see profiles
SET local role anon;
SELECT results_eq(
  'SELECT count(*)::int FROM profiles',
  ARRAY[0],
  'Anonymous user cannot see any profiles'
);

-- 12-13. Trigger: auto-create profile on user signup
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

SELECT * FROM finish();
ROLLBACK;
