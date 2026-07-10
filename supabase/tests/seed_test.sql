-- pgTAP tests for supabase/seed.sql.
--
-- These tests assert the persisted state produced by `supabase db reset`.
-- They must be run *after* reset (the default `supabase test db` workflow
-- does not reset; CI and local `bun run test:db` both rely on the seed
-- having already been applied).

begin;
select plan(15);

-- 1. Four demo profiles exist with the expected stable IDs.
select is(
  (select count(*)::int
     from public.profiles
     where id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000d'
     )),
  4,
  'seed creates four demo profiles with stable IDs'
);

-- 2-5. Each demo profile has display_name + cohort_id set and the cohort
--     mapping is exactly the one seed.sql prescribes.
select is(
  (select c.name
     from public.profiles p
     join public.cohorts c on c.id = p.cohort_id
     where p.id = '00000000-0000-0000-0000-00000000000a'),
  'LGE-1'::text,
  'Alice is assigned to cohort LGE-1'
);

select is(
  (select c.name
     from public.profiles p
     join public.cohorts c on c.id = p.cohort_id
     where p.id = '00000000-0000-0000-0000-00000000000b'),
  'LGE-2'::text,
  'Bob is assigned to cohort LGE-2'
);

select is(
  (select c.name
     from public.profiles p
     join public.cohorts c on c.id = p.cohort_id
     where p.id = '00000000-0000-0000-0000-00000000000c'),
  'Inflearn'::text,
  'Carol is assigned to cohort Inflearn'
);

select is(
  (select c.name
     from public.profiles p
     join public.cohorts c on c.id = p.cohort_id
     where p.id = '00000000-0000-0000-0000-00000000000d'),
  'TOYCRANE'::text,
  'the operator is assigned to cohort TOYCRANE'
);

-- 6. display_name is populated for every demo profile.
select is(
  (select count(*)::int
     from public.profiles
     where id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000d'
     )
       and display_name is not null
       and length(btrim(display_name)) > 0),
  4,
  'every demo profile has a non-empty display_name'
);

-- 7. All four display_names are distinct (Scenario 1 — "three distinct
--    authors" among the students, plus the operator).
select is(
  (select count(distinct display_name)::int
     from public.profiles
     where id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000d'
     )),
  4,
  'demo profile display_names are distinct'
);

-- 8. LGE-3 has no projects assigned via demo seed (empty-cohort case).
select is(
  (select count(*)::int
     from public.profiles p
     join public.cohorts c on c.id = p.cohort_id
     where c.name = 'LGE-3'),
  0,
  'LGE-3 has no seeded profiles (empty-cohort case)'
);

-- 9. Three demo projects exist (one per student user).
select is(
  (select count(*)::int
     from public.projects
     where user_id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c'
     )),
  3,
  'seed creates three demo projects (one per student user)'
);

-- 10. The operator owns no seeded projects (keeps the public board and the
--     seeded-demo e2e assertions untouched).
select is(
  (select count(*)::int
     from public.projects
     where user_id = '00000000-0000-0000-0000-00000000000d'),
  0,
  'the operator owns no seeded projects'
);

-- 11. Each demo project's cohort matches its owner's cohort.
select is(
  (select count(*)::int
     from public.projects p
     join public.profiles pr on pr.id = p.user_id
     where p.user_id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c'
     )
       and p.cohort_id = pr.cohort_id),
  3,
  'each demo project cohort matches the owner profile cohort'
);

-- 12. Cohort-filtered counts: LGE-1, LGE-2, Inflearn each return exactly 1;
--     LGE-3 returns 0.
select is(
  (select count(*)::int
     from public.projects p
     join public.cohorts c on c.id = p.cohort_id
     where c.name = 'LGE-1'),
  1,
  'LGE-1 has exactly one seeded project'
);
select is(
  (select count(*)::int
     from public.projects p
     join public.cohorts c on c.id = p.cohort_id
     where c.name = 'LGE-3'),
  0,
  'LGE-3 has zero seeded projects'
);

-- 13. Every demo project's primary image path resolves to a row in
--     storage.objects under the project-screenshots bucket.
select is(
  (select count(*)::int
     from public.projects p
     where p.user_id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c'
     )
       and exists (
         select 1 from storage.objects o
         where o.bucket_id = 'project-screenshots'
           and o.name = p.images->0->>'path'
       )),
  3,
  'every demo project primary image path matches an uploaded storage object'
);

-- 14. GoTrue token columns are backfilled to '' (not NULL) on demo users.
--     GoTrue scans them into non-nullable Go strings, so a NULL row breaks
--     the admin API (generateLink, getUserById) with "converting NULL to
--     string is unsupported".
select is(
  (select count(*)::int
     from auth.users
     where id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000d'
     )
       and confirmation_token = ''
       and recovery_token = ''
       and email_change_token_new = ''
       and email_change = ''),
  4,
  'demo auth.users rows backfill GoTrue token columns to empty strings'
);

select * from finish();
rollback;
