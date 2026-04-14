-- pgTAP tests for projects_with_vote_count PII boundary:
--   Anonymous visitors can read author_display_name and avatar_url via the view
--   The view never exposes profiles.email or other PII columns
--   Anon is denied direct SELECT on profiles.email

BEGIN;
SELECT plan(5);

-- 1. View exists
SELECT has_view(
  'public', 'projects_with_vote_count',
  'projects_with_vote_count view should exist'
);

-- 2. View does NOT expose an email column
SELECT hasnt_column(
  'public', 'projects_with_vote_count', 'email',
  'projects_with_vote_count must not expose an email column'
);

-- Seed: one owner, one project
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000061',
    'sec-owner@example.com',
    '{"full_name": "Sec Owner"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  );

UPDATE public.profiles
SET cohort_id = (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
    display_name = 'Sec Owner Display'
WHERE id = '00000000-0000-0000-0000-000000000061';

INSERT INTO public.projects (id, user_id, cohort_id, title, tagline, project_url, screenshot_path)
VALUES (
  '00000000-0000-0000-0000-000000000071',
  '00000000-0000-0000-0000-000000000061',
  (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
  'Sec Test Project',
  'Security boundary test target',
  'https://sec.example.com',
  'owner/sec.png'
);

-- 3. Anon can read author_display_name from the view
SET local role anon;
SELECT results_eq(
  $$SELECT author_display_name FROM public.projects_with_vote_count
    WHERE id = '00000000-0000-0000-0000-000000000071'$$,
  ARRAY['Sec Owner Display'::text],
  'Anonymous visitor can read author_display_name through the view'
);

-- 4. Anon can read author_avatar_url from the view (value is null, but column is accessible)
SELECT is_empty(
  $$SELECT author_avatar_url FROM public.projects_with_vote_count
    WHERE id = '00000000-0000-0000-0000-000000000071'
      AND author_avatar_url IS NOT NULL$$,
  'author_avatar_url column is accessible to anon via the view'
);

-- 5. Anon gets no rows from profiles (no anon SELECT policy), blocking
--    any attempt to read PII like email directly.
SELECT is_empty(
  $$SELECT email FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-000000000061'$$,
  'Anonymous visitor gets no rows from profiles — RLS blocks direct PII access'
);

RESET role;

SELECT * FROM finish();
ROLLBACK;
