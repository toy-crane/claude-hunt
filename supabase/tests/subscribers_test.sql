-- pgTAP tests for the subscribers table (docs 사이트 랜딩 구독 폼):
--   schema shape (id / email / source / consented_at / created_at / updated_at)
--   server-only posture: RLS enabled, anon/authenticated 권한 없음 (42501)
--   lower(email) case-insensitive unique index
--   moddatetime trigger on updated_at

BEGIN;
SELECT plan(15);

-- 1. Table exists
SELECT has_table('public', 'subscribers', 'subscribers table should exist');

-- 2-7. Columns
SELECT has_column('public', 'subscribers', 'id', 'subscribers should have id column');
SELECT has_column('public', 'subscribers', 'email', 'subscribers should have email column');
SELECT has_column('public', 'subscribers', 'source', 'subscribers should have source column');
SELECT has_column('public', 'subscribers', 'consented_at', 'subscribers should have consented_at column');
SELECT has_column('public', 'subscribers', 'created_at', 'subscribers should have created_at column');
SELECT has_column('public', 'subscribers', 'updated_at', 'subscribers should have updated_at column');

-- 8. RLS is enabled
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscribers'),
  true,
  'RLS should be enabled on subscribers'
);

-- 9. Server-side insert works and source defaults to 'landing'
INSERT INTO public.subscribers (email) VALUES ('Test@Example.com');
SELECT is(
  (SELECT source FROM public.subscribers WHERE email = 'Test@Example.com'),
  'landing',
  'source should default to landing'
);

-- 10. lower(email) unique: case-insensitive duplicate violates 23505
SELECT throws_ok(
  $$INSERT INTO public.subscribers (email) VALUES ('test@example.com')$$,
  '23505',
  NULL,
  'Duplicate email (case-insensitive) should violate the unique index'
);

-- 11-12. Anon has no privileges at all (revoked, 42501)
SET local role anon;
SELECT throws_ok(
  $$SELECT count(*) FROM public.subscribers$$,
  '42501',
  NULL,
  'Anon cannot select subscribers'
);
SELECT throws_ok(
  $$INSERT INTO public.subscribers (email) VALUES ('anon@example.com')$$,
  '42501',
  NULL,
  'Anon cannot insert subscribers'
);

-- 13-14. Authenticated has no privileges either (server-only table)
RESET role;
SET local role authenticated;
SELECT throws_ok(
  $$SELECT count(*) FROM public.subscribers$$,
  '42501',
  NULL,
  'Authenticated cannot select subscribers'
);
SELECT throws_ok(
  $$INSERT INTO public.subscribers (email) VALUES ('user@example.com')$$,
  '42501',
  NULL,
  'Authenticated cannot insert subscribers'
);

-- 15. moddatetime trigger advances updated_at on row update
-- 같은 트랜잭션에서는 now()가 고정되므로, 과거 시각으로 넣은 행이
-- UPDATE 후 트랜잭션 now()로 당겨지는지 확인한다.
RESET role;
INSERT INTO public.subscribers (email, updated_at)
VALUES ('trigger-check@example.com', now() - interval '1 hour');
UPDATE public.subscribers SET source = 'landing' WHERE email = 'trigger-check@example.com';
SELECT cmp_ok(
  (SELECT updated_at FROM public.subscribers WHERE email = 'trigger-check@example.com'),
  '>',
  now() - interval '1 hour',
  'moddatetime trigger advances updated_at on row update'
);

SELECT * FROM finish();
ROLLBACK;
