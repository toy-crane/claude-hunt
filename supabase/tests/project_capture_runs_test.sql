begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Seed one owner (handle_new_user creates the profile) and one project.
insert into auth.users (
  id, email, raw_user_meta_data, raw_app_meta_data, aud, role,
  instance_id, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000081',
  'capture-owner@example.com',
  '{}'::jsonb,
  '{"provider": "email"}'::jsonb,
  'authenticated', 'authenticated',
  '00000000-0000-0000-0000-000000000000', now(), now()
);

update public.profiles
set cohort_id = (select id from public.cohorts order by name limit 1)
where id = '00000000-0000-0000-0000-000000000081';

insert into public.projects (id, user_id, cohort_id, title, tagline, project_url, images)
values (
  '00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-000000000081',
  (select id from public.cohorts order by name limit 1),
  'Lunch Roulette',
  'Picks today''s lunch',
  'https://lunch-roulette.example.com',
  '[{"path": "u/first.jpg"}]'::jsonb
);

-- 1-2. Only the server role may touch capture runs.
select table_privs_are(
  'public', 'project_capture_runs', 'authenticated', array[]::text[],
  'Signed-in users have no privileges on capture runs'
);
select table_privs_are(
  'public', 'project_capture_runs', 'anon', array[]::text[],
  'Visitors have no privileges on capture runs'
);

-- 3. The append function is callable only by the server role.
select function_privs_are(
  'public', 'append_project_auto_image', array['uuid', 'jsonb', 'jsonb'],
  'authenticated', array[]::text[],
  'Signed-in users cannot call the auto-image append'
);
select function_privs_are(
  'public', 'append_project_auto_image', array['uuid', 'jsonb', 'jsonb'],
  'anon', array[]::text[],
  'Visitors cannot call the auto-image append'
);

set local role service_role;

-- 5. A run row records the owner and defaults to running.
insert into public.project_capture_runs (id, project_id, user_id)
values (
  '00000000-0000-0000-0000-0000000000a9',
  '00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-000000000081'
);
select results_eq(
  $$select status, images_added::int from public.project_capture_runs
    where id = '00000000-0000-0000-0000-0000000000a9'$$,
  $$values ('running'::text, 0)$$,
  'A new capture run starts as running with no images added'
);

-- 6. Unknown statuses are rejected.
select throws_ok(
  $$update public.project_capture_runs set status = 'paused'
    where id = '00000000-0000-0000-0000-0000000000a9'$$,
  '23514',
  null,
  'Capture run status is limited to the known states'
);

-- 7-8. Appending succeeds while the gallery is unchanged.
select is(
  public.append_project_auto_image(
    '00000000-0000-0000-0000-0000000000f1',
    '[{"path": "u/first.jpg"}]'::jsonb,
    '{"path": "u/second.jpg"}'::jsonb
  ),
  true,
  'Append succeeds when the gallery matches what the run expected'
);
select is(
  (select images from public.projects where id = '00000000-0000-0000-0000-0000000000f1'),
  '[{"path": "u/first.jpg"}, {"path": "u/second.jpg"}]'::jsonb,
  'The captured image is added after the existing ones'
);

-- 9-10. A stale expectation (owner changed the gallery) is discarded.
select is(
  public.append_project_auto_image(
    '00000000-0000-0000-0000-0000000000f1',
    '[{"path": "u/first.jpg"}]'::jsonb,
    '{"path": "u/late.jpg"}'::jsonb
  ),
  false,
  'Append is refused when the gallery changed since the run last saw it'
);
select is(
  (select jsonb_array_length(images) from public.projects where id = '00000000-0000-0000-0000-0000000000f1'),
  2,
  'A refused append leaves the gallery untouched'
);

-- 11-12. The gallery never grows past five images.
reset role;
update public.projects
set images = '[{"path":"a"},{"path":"b"},{"path":"c"},{"path":"d"},{"path":"e"}]'::jsonb
where id = '00000000-0000-0000-0000-0000000000f1';
set local role service_role;
select is(
  public.append_project_auto_image(
    '00000000-0000-0000-0000-0000000000f1',
    '[{"path":"a"},{"path":"b"},{"path":"c"},{"path":"d"},{"path":"e"}]'::jsonb,
    '{"path": "u/sixth.jpg"}'::jsonb
  ),
  false,
  'Append is refused once the gallery holds five images'
);
select is(
  (select jsonb_array_length(images) from public.projects where id = '00000000-0000-0000-0000-0000000000f1'),
  5,
  'A full gallery stays at five images'
);

-- 13. updated_at moves on update.
reset role;
update public.project_capture_runs
set updated_at = '2000-01-01'::timestamptz
where id = '00000000-0000-0000-0000-0000000000a9';
update public.project_capture_runs
set status = 'succeeded'
where id = '00000000-0000-0000-0000-0000000000a9';
select ok(
  (select updated_at > '2000-01-01'::timestamptz from public.project_capture_runs
   where id = '00000000-0000-0000-0000-0000000000a9'),
  'Updating a capture run refreshes updated_at'
);

-- 14. Deleting the project removes its capture runs.
delete from public.projects where id = '00000000-0000-0000-0000-0000000000f1';
select is(
  (select count(*)::int from public.project_capture_runs
   where project_id = '00000000-0000-0000-0000-0000000000f1'),
  0,
  'Deleting a project cascades to its capture runs'
);

select * from finish();
rollback;
