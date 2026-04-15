-- Seed local-only demo data for `supabase db reset`.
--
-- Loaded automatically by the CLI after migrations on `supabase db reset`.
-- Safe to re-run: every INSERT uses `ON CONFLICT ... DO NOTHING`.
--
-- What this seeds:
--   1. Cohorts (names + Korean labels)
--   2. Three demo users in auth.users (+ auth.identities), one per cohort.
--      Password is not set — demo sign-in is out of scope.
--      Profiles are auto-created by the `handle_new_user` trigger, then
--      updated here to set `display_name` and `cohort_id`.
--   3. Three projects (one per user), each referencing a screenshot key
--      that the CLI uploads into the `project-screenshots` bucket via
--      `objects_path` in config.toml.

------------------------------------------------------------------------------
-- 1. Cohorts
------------------------------------------------------------------------------

insert into public.cohorts (name, label) values
  ('LGE-1',    'LG전자 1기'),
  ('LGE-2',    'LG전자 2기'),
  ('LGE-3',    'LG전자 3기'),
  ('Inflearn', '인프런')
on conflict (name) do nothing;

------------------------------------------------------------------------------
-- 2. Demo users (auth.users + auth.identities)
------------------------------------------------------------------------------

do $$
declare
  u1 uuid := '00000000-0000-0000-0000-00000000000a';
  u2 uuid := '00000000-0000-0000-0000-00000000000b';
  u3 uuid := '00000000-0000-0000-0000-00000000000c';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'alice@example.com', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Alice Kim"}'::jsonb, now(), now()),
    (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'bob@example.com', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Bob Lee"}'::jsonb, now(), now()),
    (u3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'carol@example.com', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Carol Park"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values
    (u1, u1, jsonb_build_object('sub', u1::text, 'email', 'alice@example.com'),
     'email', u1::text, now(), now(), now()),
    (u2, u2, jsonb_build_object('sub', u2::text, 'email', 'bob@example.com'),
     'email', u2::text, now(), now(), now()),
    (u3, u3, jsonb_build_object('sub', u3::text, 'email', 'carol@example.com'),
     'email', u3::text, now(), now(), now())
  on conflict (provider, provider_id) do nothing;
end $$;

-- Fill profile fields the trigger leaves NULL: display_name and cohort_id.
-- The trigger already populated id, email, and full_name from auth metadata.
-- display_name values are chosen to not collide with case-insensitive
-- fixtures in supabase/tests/*.sql (e.g. 'Alice' in profiles_test.sql).
update public.profiles
  set display_name = '지우',
      cohort_id = (select id from public.cohorts where name = 'LGE-1')
  where id = '00000000-0000-0000-0000-00000000000a';

update public.profiles
  set display_name = '하늘',
      cohort_id = (select id from public.cohorts where name = 'LGE-2')
  where id = '00000000-0000-0000-0000-00000000000b';

update public.profiles
  set display_name = '소라',
      cohort_id = (select id from public.cohorts where name = 'Inflearn')
  where id = '00000000-0000-0000-0000-00000000000c';
