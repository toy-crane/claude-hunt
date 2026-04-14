-- pgTAP tests for RLS on storage.objects in the `project-screenshots`
-- bucket. Bucket config itself (public, 5 MiB, JPEG/PNG/WebP) lives in
-- supabase/config.toml and is verified implicitly by the E2E upload
-- flow (Task 12) and by supabase start loading the config without
-- error.

BEGIN;
SELECT plan(8);

-- 1. Bucket row exists (materialised by `supabase start`/`db reset` from config.toml)
SELECT results_eq(
  $$SELECT count(*)::int FROM storage.buckets WHERE id = 'project-screenshots'$$,
  ARRAY[1],
  'project-screenshots bucket should exist'
);

-- 2. Bucket is public
SELECT results_eq(
  $$SELECT public FROM storage.buckets WHERE id = 'project-screenshots'$$,
  ARRAY[true],
  'project-screenshots bucket should be public'
);

-- 3. Bucket file size limit is 5 MiB
SELECT results_eq(
  $$SELECT file_size_limit::bigint FROM storage.buckets WHERE id = 'project-screenshots'$$,
  ARRAY[(5 * 1024 * 1024)::bigint],
  'project-screenshots file_size_limit should be 5 MiB'
);

-- 4. Bucket allowed MIME types match the spec (JPEG / PNG / WebP)
SELECT is(
  (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'project-screenshots'),
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
  'project-screenshots should allow only JPEG, PNG, and WebP'
);

-- 5-7. RLS policies exist on storage.objects for this bucket
SELECT policies_are(
  'storage',
  'objects',
  ARRAY[
    'Public can read project-screenshots',
    'Authenticated can upload own project-screenshots',
    'Owners can update their project-screenshots',
    'Owners can delete their project-screenshots'
  ],
  'project-screenshots RLS policies should exist on storage.objects'
);

-- Seed an auth user for the anon-insert negative test
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000041',
  'storage-test@example.com',
  '{"full_name": "Storage Test"}'::jsonb,
  '{"provider": "email"}'::jsonb,
  'authenticated', 'authenticated',
  '00000000-0000-0000-0000-000000000000',
  now(), now()
);

-- 6. Anon cannot insert objects into the bucket (no anon insert policy)
SET local role anon;
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('project-screenshots', 'anon/tries.png',
            '00000000-0000-0000-0000-000000000041'::uuid)$$,
  '42501',
  NULL,
  'Anon cannot insert into project-screenshots'
);

-- 7. Authenticated user can insert when owner = auth.uid()
RESET role;
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000041"}';

SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('project-screenshots', '00000000-0000-0000-0000-000000000041/screenshot.png',
            '00000000-0000-0000-0000-000000000041'::uuid)$$,
  'Authenticated user can insert when owner = auth.uid()'
);

-- 8. Authenticated user cannot insert with someone else's owner
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('project-screenshots', '00000000-0000-0000-0000-000000000041/spoof.png',
            '00000000-0000-0000-0000-000000000099'::uuid)$$,
  '42501',
  NULL,
  'Authenticated user cannot insert with spoofed owner'
);

SELECT * FROM finish();
ROLLBACK;
