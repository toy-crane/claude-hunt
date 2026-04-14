-- pgTAP tests for the votes table and projects_with_vote_count view:
--   schema shape + unique (user_id, project_id)
--   RLS: public select; owner-only insert/delete
--   Cascade delete from projects
--   View exposes vote_count (= 0 when no votes) and author_display_name
--   Anonymous visitors can read author_display_name via the view

BEGIN;
SELECT plan(18);

-- 1. votes table exists
SELECT has_table('public', 'votes', 'votes table should exist');

-- 2-4. Columns
SELECT has_column('public', 'votes', 'user_id', 'votes should have user_id');
SELECT has_column('public', 'votes', 'project_id', 'votes should have project_id');
SELECT has_column('public', 'votes', 'created_at', 'votes should have created_at');

-- 5. Unique (user_id, project_id)
SELECT col_is_unique(
  'public', 'votes', ARRAY['user_id', 'project_id'],
  'votes should enforce unique (user_id, project_id)'
);

-- 6. View exists
SELECT has_view(
  'public', 'projects_with_vote_count',
  'projects_with_vote_count view should exist'
);

-- Seed users (owner + voter), cohort assignment, one project
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000021',
    'vote-owner@example.com',
    '{"full_name": "Vote Owner"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  ),
  ('00000000-0000-0000-0000-000000000022',
    'vote-voter@example.com',
    '{"full_name": "Voter"}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000',
    now(), now()
  );

UPDATE public.profiles
SET cohort_id = (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
    display_name = 'Vote Owner'
WHERE id = '00000000-0000-0000-0000-000000000021';

INSERT INTO public.projects (id, user_id, cohort_id, title, tagline, project_url, screenshot_path)
VALUES (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000021',
  (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
  'Proj For Votes',
  'Vote test target',
  'https://vote.example.com',
  'owner/vote-target.png'
);

-- 7. View reports vote_count = 0 when no votes exist
SELECT results_eq(
  $$SELECT vote_count::int FROM public.projects_with_vote_count
    WHERE id = '00000000-0000-0000-0000-000000000031'$$,
  ARRAY[0],
  'View returns vote_count = 0 when no votes exist (LEFT JOIN + coalesce)'
);

-- 8. Anon can read the view with author_display_name populated
SET local role anon;
SELECT results_eq(
  $$SELECT author_display_name FROM public.projects_with_vote_count
    WHERE id = '00000000-0000-0000-0000-000000000031'$$,
  ARRAY['Vote Owner'::text],
  'Anonymous visitor can read author_display_name through the view'
);
RESET role;

-- 9. Authenticated voter can insert a vote on someone else's project
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000022"}';

SELECT lives_ok(
  $$INSERT INTO public.votes (user_id, project_id)
    VALUES (
      '00000000-0000-0000-0000-000000000022',
      '00000000-0000-0000-0000-000000000031'
    )$$,
  'Authenticated voter can insert a vote on another user''s project'
);

-- 10. Duplicate (user_id, project_id) pair violates unique constraint
SELECT throws_ok(
  $$INSERT INTO public.votes (user_id, project_id)
    VALUES (
      '00000000-0000-0000-0000-000000000022',
      '00000000-0000-0000-0000-000000000031'
    )$$,
  '23505',
  NULL,
  'Duplicate vote for the same (user, project) is rejected'
);

-- 11. Deleting the project cascades to its votes
RESET role;
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-000000000031';

SELECT results_eq(
  $$SELECT count(*)::int FROM public.votes
    WHERE project_id = '00000000-0000-0000-0000-000000000031'$$,
  ARRAY[0],
  'Deleting a project cascades to delete its votes'
);

-- 12-13. Self-vote prevention trigger (Task 8b)
-- Insert a fresh project owned by user 000...021 and try to vote on it
-- from that same user's session — trigger must raise.
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000021"}';

SELECT lives_ok(
  $$INSERT INTO public.projects (id, user_id, cohort_id, title, tagline, project_url, screenshot_path)
    VALUES (
      '00000000-0000-0000-0000-000000000032',
      '00000000-0000-0000-0000-000000000021',
      (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
      'Self Vote Test',
      'target for self-vote',
      'https://self.example.com',
      'owner/self.png'
    )$$,
  'Owner can insert their own project'
);

SELECT throws_ok(
  $$INSERT INTO public.votes (user_id, project_id)
    VALUES (
      '00000000-0000-0000-0000-000000000021',
      '00000000-0000-0000-0000-000000000032'
    )$$,
  '23514',
  'users cannot vote on their own projects',
  'Self-vote trigger rejects the insert'
);

-- 14. votes has updated_at column
RESET role;
SELECT has_column(
  'public', 'votes', 'updated_at',
  'votes should have updated_at column'
);

-- 15. handle_updated_at trigger exists on votes
SELECT has_trigger(
  'public', 'votes', 'handle_updated_at',
  'handle_updated_at trigger should exist on votes'
);

-- Seed a vote for behavioral tests. Runs as superuser to bypass RLS; the
-- self-vote trigger still applies, so voter (022) != project owner (021).
INSERT INTO public.votes (user_id, project_id)
VALUES (
  '00000000-0000-0000-0000-000000000022',
  '00000000-0000-0000-0000-000000000032'
);

-- 16. Freshly inserted vote has updated_at within 1 second of created_at.
SELECT cmp_ok(
  (SELECT EXTRACT(EPOCH FROM (updated_at - created_at))::numeric
     FROM public.votes
     WHERE user_id = '00000000-0000-0000-0000-000000000022'
       AND project_id = '00000000-0000-0000-0000-000000000032'),
  '<=',
  1::numeric,
  'Freshly inserted vote has updated_at within 1 second of created_at'
);

-- 17. Update advances updated_at beyond its prior value.
--     Votes are append-only in app code, so we drive the UPDATE directly
--     via SQL. pgTAP runs in a single transaction, so we force a past
--     updated_at with the trigger disabled, then re-enable and UPDATE to
--     prove the trigger fires and overwrites.
ALTER TABLE public.votes DISABLE TRIGGER handle_updated_at;
UPDATE public.votes
  SET updated_at = '2020-01-01T00:00:00Z'::timestamptz
  WHERE user_id = '00000000-0000-0000-0000-000000000022'
    AND project_id = '00000000-0000-0000-0000-000000000032';
ALTER TABLE public.votes ENABLE TRIGGER handle_updated_at;

-- Votes has no non-key mutable column; a no-op SET on project_id still
-- fires BEFORE UPDATE triggers in Postgres.
UPDATE public.votes
  SET project_id = project_id
  WHERE user_id = '00000000-0000-0000-0000-000000000022'
    AND project_id = '00000000-0000-0000-0000-000000000032';

SELECT cmp_ok(
  (SELECT updated_at FROM public.votes
     WHERE user_id = '00000000-0000-0000-0000-000000000022'
       AND project_id = '00000000-0000-0000-0000-000000000032'),
  '>',
  '2020-01-01T00:00:00Z'::timestamptz,
  'Updating a vote advances updated_at beyond its prior value'
);

-- 18. Caller-supplied updated_at is overridden by the trigger.
UPDATE public.votes
  SET updated_at = '2000-01-01T00:00:00Z'::timestamptz
  WHERE user_id = '00000000-0000-0000-0000-000000000022'
    AND project_id = '00000000-0000-0000-0000-000000000032';

SELECT cmp_ok(
  (SELECT updated_at FROM public.votes
     WHERE user_id = '00000000-0000-0000-0000-000000000022'
       AND project_id = '00000000-0000-0000-0000-000000000032'),
  '>',
  '2000-01-01T00:00:00Z'::timestamptz,
  'Caller-supplied past updated_at on votes is overridden by the trigger'
);

SELECT * FROM finish();
ROLLBACK;
