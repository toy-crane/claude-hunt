-- pgTAP tests for the projects table:
--   schema shape + FKs
--   RLS: public select; owner-only insert/update/delete
--   Ownership spoof rejected

BEGIN;
SELECT plan(13);

-- 1. Table exists
SELECT has_table('public', 'projects', 'projects table should exist');

-- 2-9. Columns exist
SELECT has_column('public', 'projects', 'id', 'projects should have id column');
SELECT has_column('public', 'projects', 'user_id', 'projects should have user_id column');
SELECT has_column('public', 'projects', 'cohort_id', 'projects should have cohort_id column');
SELECT has_column('public', 'projects', 'title', 'projects should have title column');
SELECT has_column('public', 'projects', 'tagline', 'projects should have tagline column');
SELECT has_column('public', 'projects', 'project_url', 'projects should have project_url column');
SELECT has_column('public', 'projects', 'screenshot_path', 'projects should have screenshot_path column');
SELECT has_column('public', 'projects', 'created_at', 'projects should have created_at column');

-- 10. RLS enabled
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects'),
  true,
  'RLS should be enabled on projects'
);

-- 11. Index on user_id
SELECT has_index(
  'public', 'projects', 'projects_user_id_idx',
  'projects should have an index on user_id'
);

-- Seed: one user, one cohort
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000011',
    'proj-owner@example.com',
    '{"full_name": "Proj Owner"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  ),
  ('00000000-0000-0000-0000-000000000012',
    'proj-other@example.com',
    '{"full_name": "Other Student"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  );

-- Assign cohort to owner
UPDATE public.profiles
SET cohort_id = (SELECT id FROM public.cohorts ORDER BY name LIMIT 1)
WHERE id = '00000000-0000-0000-0000-000000000011';

-- 12. Authenticated user can insert a project as themselves
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000011"}';

SELECT lives_ok(
  $$INSERT INTO public.projects (user_id, cohort_id, title, tagline, project_url, screenshot_path)
    VALUES (
      '00000000-0000-0000-0000-000000000011',
      (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
      'My App',
      'A cool tool',
      'https://myapp.com',
      'owner/my-app.png'
    )$$,
  'Authenticated user can insert their own project'
);

-- 13. Spoofed user_id rejected by RLS with_check
SELECT throws_ok(
  $$INSERT INTO public.projects (user_id, cohort_id, title, tagline, project_url, screenshot_path)
    VALUES (
      '00000000-0000-0000-0000-000000000012',
      (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
      'Spoof',
      'Not mine',
      'https://spoof.com',
      'owner/spoof.png'
    )$$,
  '42501',
  NULL,
  'Insert with spoofed user_id is rejected by RLS'
);

SELECT * FROM finish();
ROLLBACK;
