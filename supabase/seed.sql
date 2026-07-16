-- Seed local-only demo data for `supabase db reset`.
--
-- Loaded automatically by the CLI after migrations on `supabase db reset`.
-- Safe to re-run: every INSERT uses `ON CONFLICT ... DO NOTHING`.
--
-- What this seeds:
--   1. Cohorts (names + Korean labels)
--   2. Four demo users in auth.users (+ auth.identities): one student per
--      student cohort, plus the operator (TOYCRANE cohort, no project).
--      Password is not set — demo sign-in is out of scope.
--      Profiles are auto-created by the `handle_new_user` trigger, then
--      updated here to set `display_name` and `cohort_id`.
--   3. Three projects (one per student user), each referencing a screenshot
--      key that the CLI uploads into the `project-screenshots` bucket via
--      `objects_path` in config.toml.

------------------------------------------------------------------------------
-- 1. Cohorts
------------------------------------------------------------------------------

-- TOYCRANE is the operator-only cohort (mirrors production). It must NOT
-- appear in any user-facing cohort list — fetchCohorts filters it out —
-- and is seeded here so that hiding can be verified locally.
-- `display_order` is the user-facing order (higher = newer). TOYCRANE keeps 0
-- so it sorts last, mirroring the production backfill.
insert into public.cohorts (name, label, display_order) values
  ('LGE-1',    'LG전자 1기', 1),
  ('LGE-2',    'LG전자 2기', 2),
  ('LGE-3',    'LG전자 3기', 3),
  ('Inflearn', '인프런',     4),
  ('TOYCRANE', 'toycrane',  0)
on conflict (name) do nothing;

------------------------------------------------------------------------------
-- 2. Demo users (auth.users + auth.identities)
------------------------------------------------------------------------------

do $$
declare
  u1 uuid := '00000000-0000-0000-0000-00000000000a';
  u2 uuid := '00000000-0000-0000-0000-00000000000b';
  u3 uuid := '00000000-0000-0000-0000-00000000000c';
  u4 uuid := '00000000-0000-0000-0000-00000000000d';
begin
  -- The four token columns must be '' (not NULL): GoTrue scans them into
  -- non-nullable Go strings, so a NULL row breaks the admin API
  -- (generateLink, getUserById) with "converting NULL to string is
  -- unsupported" — same class of bug as the listUsers 500 documented in
  -- e2e/helpers/supabase-admin.ts.
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'alice@example.com', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Alice Kim"}'::jsonb, now(), now(),
     '', '', '', ''),
    (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'bob@example.com', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Bob Lee"}'::jsonb, now(), now(),
     '', '', '', ''),
    (u3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'carol@example.com', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Carol Park"}'::jsonb, now(), now(),
     '', '', '', ''),
    (u4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'operator@example.com', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Toy Crane"}'::jsonb, now(), now(),
     '', '', '', '')
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
     'email', u3::text, now(), now(), now()),
    (u4, u4, jsonb_build_object('sub', u4::text, 'email', 'operator@example.com'),
     'email', u4::text, now(), now(), now())
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

-- The operator account: TOYCRANE cohort, no project. Lets local testing
-- exercise the operator-cohort viewpoint (e.g. the settings page showing a
-- non-selectable cohort).
update public.profiles
  set display_name = '두루미',
      cohort_id = (select id from public.cohorts where name = 'TOYCRANE')
  where id = '00000000-0000-0000-0000-00000000000d';

------------------------------------------------------------------------------
-- 3. Demo projects (one per student user). Fixed IDs so the Acceptance check
--    "same image URLs across resets" holds — the public bucket URL
--    includes the object key, which is keyed by user UUID + filename.
------------------------------------------------------------------------------

insert into public.projects (
  id, user_id, cohort_id, title, tagline, description, project_url, github_url, images
) values
  (
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-00000000000a',
    (select id from public.cohorts where name = 'LGE-1'),
    'Paint Studio',
    '웹에서 바로 쓰는 간단한 드로잉 툴',
    $$Paint Studio는 설치 없이 브라우저에서 바로 그림을 그릴 수 있는 드로잉 툴이에요.

레이어, 브러시 프리셋, PNG 내보내기를 지원하고 작업물은 자동으로 저장돼요.$$,
    'https://paint-studio.example.com',
    'https://github.com/claude-hunt/paint-studio',
    jsonb_build_array(
      jsonb_build_object('path', '00000000-0000-0000-0000-00000000000a/paint-studio.png'),
      jsonb_build_object('path', '00000000-0000-0000-0000-00000000000a/wide-canvas.png')
    )
  ),
  (
    '00000000-0000-0000-0000-0000000000b1',
    '00000000-0000-0000-0000-00000000000b',
    (select id from public.cohorts where name = 'LGE-2'),
    'Note Keeper',
    '마크다운으로 빠르게 메모하고 태그로 정리해요',
    null,
    'https://note-keeper.example.com',
    null,
    jsonb_build_array(
      jsonb_build_object('path', '00000000-0000-0000-0000-00000000000b/note-keeper.png'),
      jsonb_build_object('path', '00000000-0000-0000-0000-00000000000b/mobile-portrait.png')
    )
  ),
  (
    '00000000-0000-0000-0000-0000000000c1',
    '00000000-0000-0000-0000-00000000000c',
    (select id from public.cohorts where name = 'Inflearn'),
    'Focus Timer',
    '뽀모도로 방식으로 집중 세션을 기록해 주는 타이머',
    null,
    'https://focus-timer.example.com',
    null,
    jsonb_build_array(
      jsonb_build_object('path', '00000000-0000-0000-0000-00000000000c/focus-timer.png'),
      jsonb_build_object('path', '00000000-0000-0000-0000-00000000000c/square.png')
    )
  )
on conflict (id) do nothing;
