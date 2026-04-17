-- pgTAP tests for supabase/seed.sql.
--
-- These tests assert the persisted state produced by `supabase db reset`.
-- They must be run *after* reset (the default `supabase test db` workflow
-- does not reset; CI and local `bun run test:db` both rely on the seed
-- having already been applied).

begin;
select plan(12);

-- 1. Three demo profiles exist with the expected stable IDs.
select is(
  (select count(*)::int
     from public.profiles
     where id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c'
     )),
  3,
  'seed creates three demo profiles with stable IDs'
);

-- 2-4. Each demo profile has display_name + cohort_id set and the cohort
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

-- 5. display_name is populated for every demo profile.
select is(
  (select count(*)::int
     from public.profiles
     where id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c'
     )
       and display_name is not null
       and length(btrim(display_name)) > 0),
  3,
  'every demo profile has a non-empty display_name'
);

-- 6. All three display_names are distinct (Scenario 1 — "three distinct authors").
select is(
  (select count(distinct display_name)::int
     from public.profiles
     where id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c'
     )),
  3,
  'demo profile display_names are distinct'
);

-- 7. LGE-3 has no projects assigned via demo seed (empty-cohort case).
select is(
  (select count(*)::int
     from public.profiles p
     join public.cohorts c on c.id = p.cohort_id
     where c.name = 'LGE-3'),
  0,
  'LGE-3 has no seeded profiles (empty-cohort case)'
);

-- 8. Three demo projects exist (one per demo user).
select is(
  (select count(*)::int
     from public.projects
     where user_id in (
       '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b',
       '00000000-0000-0000-0000-00000000000c'
     )),
  3,
  'seed creates three demo projects (one per demo user)'
);

-- 9. Each demo project's cohort matches its owner's cohort.
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

-- 10. Cohort-filtered counts: LGE-1, LGE-2, Inflearn each return exactly 1;
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

-- 11. Every demo project's screenshot_path resolves to a row in
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
           and o.name = p.screenshot_path
       )),
  3,
  'every demo project screenshot_path matches an uploaded storage object'
);

select * from finish();
rollback;
