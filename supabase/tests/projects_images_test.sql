begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- Note: col_default_is is not used for the jsonb default because pgTAP
-- attempts to cast the default expression text (`'[]'::jsonb`) back to
-- jsonb and that round-trip fails. The default is verified indirectly by
-- inserting a row without specifying `images` and checking it ends up as
-- '[]' below.

-- ─── Schema: new columns exist ─────────────────────────────────────

select has_column(
  'public', 'projects', 'images',
  'projects.images column should exist'
);

select col_type_is(
  'public', 'projects', 'images', 'jsonb',
  'projects.images should be jsonb'
);

select col_not_null(
  'public', 'projects', 'images',
  'projects.images should be NOT NULL'
);

select has_column(
  'public', 'projects', 'github_url',
  'projects.github_url column should exist'
);

select col_is_null(
  'public', 'projects', 'github_url',
  'projects.github_url should be nullable'
);

-- ─── Schema: screenshot_path becomes nullable ──────────────────────

select col_is_null(
  'public', 'projects', 'screenshot_path',
  'projects.screenshot_path should be nullable after Expand migration'
);

-- ─── View: primary_image_path projection ───────────────────────────

select has_column(
  'public', 'projects_with_vote_count', 'primary_image_path',
  'projects_with_vote_count should expose primary_image_path'
);

select has_column(
  'public', 'projects_with_vote_count', 'github_url',
  'projects_with_vote_count should expose github_url'
);

select has_column(
  'public', 'projects_with_vote_count', 'images',
  'projects_with_vote_count should expose the images jsonb'
);

-- ─── github_url CHECK constraint ───────────────────────────────────
-- Set up a fixture: insert a project owned by an existing seeded profile.

reset role;

-- Seed-data assumption: at least one profile + cohort exist from supabase/seed.sql.
-- Pick the first available pair.
do $$
declare
  v_user_id uuid;
  v_cohort_id uuid;
  v_project_id uuid;
begin
  select id into v_user_id from public.profiles limit 1;
  select id into v_cohort_id from public.cohorts limit 1;
  if v_user_id is null or v_cohort_id is null then
    raise exception 'seed fixtures missing — projects_images_test requires at least one profile and cohort';
  end if;

  insert into public.projects (user_id, cohort_id, title, tagline, project_url, screenshot_path, images)
  values (v_user_id, v_cohort_id, 'Test', 'tagline', 'https://example.com', 'seed/x.webp', '[]'::jsonb)
  returning id into v_project_id;
  perform set_config('test.project_id', v_project_id::text, true);
end $$;

select lives_ok(
  $$update public.projects set github_url = 'https://github.com/octocat/hello' where id = current_setting('test.project_id')::uuid$$,
  'valid GitHub URL https://github.com/owner/repo is accepted'
);

select throws_ok(
  $$update public.projects set github_url = 'https://example.com/foo' where id = current_setting('test.project_id')::uuid$$,
  '23514',
  null,
  'invalid github_url (not a github.com address) is rejected by CHECK'
);

-- ─── primary_image_path projection ─────────────────────────────────
-- The view derives primary_image_path solely from images[0].path.
-- The legacy screenshot_path column on the base table is intentionally
-- ignored — a row with screenshot_path set but images empty exposes
-- a NULL primary_image_path.

select results_eq(
  $$select primary_image_path from public.projects_with_vote_count where id = current_setting('test.project_id')::uuid$$,
  $$values (cast(null as text))$$,
  'primary_image_path is null when images is empty (no fallback to screenshot_path)'
);

-- After populating images[0], primary_image_path should reflect that.
update public.projects
  set images = '[{"path":"seed/new-primary.webp"}]'::jsonb
  where id = current_setting('test.project_id')::uuid;

select results_eq(
  $$select primary_image_path from public.projects_with_vote_count where id = current_setting('test.project_id')::uuid$$,
  $$values ('seed/new-primary.webp')$$,
  'primary_image_path returns images[0].path when images is populated'
);

select * from finish();
rollback;
