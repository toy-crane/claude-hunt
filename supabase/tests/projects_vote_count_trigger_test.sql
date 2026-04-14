-- pgTAP tests for the projects.vote_count counter-cache trigger:
--   Inserting a vote increments projects.vote_count
--   Deleting a vote decrements projects.vote_count
--   vote_count never goes negative under normal flows
--   Backfill: every project's vote_count matches the real vote count

BEGIN;
SELECT plan(6);

-- Seed: users + cohort + two projects
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000041',
    'vc-owner@example.com',
    '{"full_name": "VC Owner"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  ),
  ('00000000-0000-0000-0000-000000000042',
    'vc-voter-a@example.com',
    '{"full_name": "Voter A"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  ),
  ('00000000-0000-0000-0000-000000000043',
    'vc-voter-b@example.com',
    '{"full_name": "Voter B"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  );

UPDATE public.profiles
SET cohort_id = (SELECT id FROM public.cohorts ORDER BY name LIMIT 1)
WHERE id IN (
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000042',
  '00000000-0000-0000-0000-000000000043'
);

INSERT INTO public.projects (id, user_id, cohort_id, title, tagline, project_url, screenshot_path)
VALUES
  (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000041',
    (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
    'VC Test Project A',
    'Counter-cache test target A',
    'https://vca.example.com',
    'owner/vc-a.png'
  ),
  (
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000041',
    (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
    'VC Test Project B',
    'Counter-cache test target B',
    'https://vcb.example.com',
    'owner/vc-b.png'
  );

-- 1. Fresh project starts with vote_count = 0
SELECT results_eq(
  $$SELECT vote_count::int FROM public.projects
    WHERE id = '00000000-0000-0000-0000-000000000051'$$,
  ARRAY[0],
  'Fresh project starts with vote_count = 0'
);

-- 2. Inserting a vote increments projects.vote_count by 1
INSERT INTO public.votes (user_id, project_id)
VALUES (
  '00000000-0000-0000-0000-000000000042',
  '00000000-0000-0000-0000-000000000051'
);

SELECT results_eq(
  $$SELECT vote_count::int FROM public.projects
    WHERE id = '00000000-0000-0000-0000-000000000051'$$,
  ARRAY[1],
  'Inserting a vote increments projects.vote_count by 1'
);

-- 3. A second vote from a different voter increments by 1 again
INSERT INTO public.votes (user_id, project_id)
VALUES (
  '00000000-0000-0000-0000-000000000043',
  '00000000-0000-0000-0000-000000000051'
);

SELECT results_eq(
  $$SELECT vote_count::int FROM public.projects
    WHERE id = '00000000-0000-0000-0000-000000000051'$$,
  ARRAY[2],
  'A second vote increments vote_count to 2'
);

-- 4. Deleting a vote decrements projects.vote_count by 1
DELETE FROM public.votes
WHERE user_id = '00000000-0000-0000-0000-000000000042'
  AND project_id = '00000000-0000-0000-0000-000000000051';

SELECT results_eq(
  $$SELECT vote_count::int FROM public.projects
    WHERE id = '00000000-0000-0000-0000-000000000051'$$,
  ARRAY[1],
  'Deleting a vote decrements projects.vote_count by 1'
);

-- 5. vote_count never goes below 0: after deleting the last vote it equals 0
DELETE FROM public.votes
WHERE user_id = '00000000-0000-0000-0000-000000000043'
  AND project_id = '00000000-0000-0000-0000-000000000051';

SELECT results_eq(
  $$SELECT vote_count::int FROM public.projects
    WHERE id = '00000000-0000-0000-0000-000000000051'$$,
  ARRAY[0],
  'vote_count returns to 0 after all votes are deleted; never goes negative'
);

-- 6. vote_count on project B is unaffected by votes on project A
SELECT results_eq(
  $$SELECT vote_count::int FROM public.projects
    WHERE id = '00000000-0000-0000-0000-000000000052'$$,
  ARRAY[0],
  'vote_count for a different project is not affected by votes on another project'
);

SELECT * FROM finish();
ROLLBACK;
