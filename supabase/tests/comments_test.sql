begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- ─── Schema: structure ─────────────────────────────────────────────

select has_table('public', 'comments', 'comments table should exist');
select has_column('public', 'comments', 'id', 'should have id column');
select has_column('public', 'comments', 'project_id', 'should have project_id column');
select has_column('public', 'comments', 'user_id', 'should have user_id column');
select has_column('public', 'comments', 'parent_comment_id', 'should have parent_comment_id column');
select has_column('public', 'comments', 'body', 'should have body column');
select has_column('public', 'comments', 'created_at', 'should have created_at column');
select has_column('public', 'comments', 'updated_at', 'should have updated_at column');

-- RLS enabled
select is(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'comments'),
  true,
  'RLS should be enabled on comments'
);

-- ─── Fixture: pick existing seeded users + a project, store ids ────

reset role;

do $$
declare
  v_alice_id uuid;
  v_bob_id uuid;
  v_project_id uuid;
begin
  -- Use seeded users (any two distinct profiles will do)
  select id into v_alice_id from public.profiles order by created_at limit 1;
  select id into v_bob_id from public.profiles where id != v_alice_id order by created_at limit 1;
  select id into v_project_id from public.projects order by created_at limit 1;
  if v_alice_id is null or v_bob_id is null or v_project_id is null then
    raise exception 'seed fixtures missing — comments_test requires 2 profiles and 1 project';
  end if;
  perform set_config('test.alice_id', v_alice_id::text, true);
  perform set_config('test.bob_id', v_bob_id::text, true);
  perform set_config('test.project_id', v_project_id::text, true);
end $$;

-- ─── Authenticated INSERT — top-level (parent_comment_id is null) ──

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.alice_id'))::text,
  true
);

select lives_ok(
  $$insert into public.comments (project_id, user_id, body)
    values (
      current_setting('test.project_id')::uuid,
      current_setting('test.alice_id')::uuid,
      'top-level comment'
    )
    returning id$$,
  'authenticated user can insert a top-level comment (parent_comment_id null)'
);

-- ─── Reply: parent's parent_comment_id is null → allowed ───────────

do $$
declare
  v_top_id uuid;
begin
  select id into v_top_id from public.comments
    where parent_comment_id is null
    order by created_at desc
    limit 1;
  perform set_config('test.top_id', v_top_id::text, true);
end $$;

select lives_ok(
  $$insert into public.comments (project_id, user_id, parent_comment_id, body)
    values (
      current_setting('test.project_id')::uuid,
      current_setting('test.alice_id')::uuid,
      current_setting('test.top_id')::uuid,
      'reply (allowed)'
    )$$,
  'reply with depth-1 parent is allowed'
);

-- ─── Reply-to-reply: depth-2 → rejected by trigger ─────────────────

do $$
declare
  v_reply_id uuid;
begin
  select id into v_reply_id from public.comments
    where parent_comment_id = current_setting('test.top_id')::uuid
    order by created_at desc
    limit 1;
  perform set_config('test.reply_id', v_reply_id::text, true);
end $$;

select throws_ok(
  $$insert into public.comments (project_id, user_id, parent_comment_id, body)
    values (
      current_setting('test.project_id')::uuid,
      current_setting('test.alice_id')::uuid,
      current_setting('test.reply_id')::uuid,
      'reply-to-reply (rejected)'
    )$$,
  '23514',
  null,
  'reply-to-reply is rejected by depth-1 trigger'
);

-- ─── Ownership: User B cannot UPDATE / DELETE User A's comment ─────

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.bob_id'))::text,
  true
);

-- UPDATE another user's comment returns 0 rows (RLS denies silently)
select results_eq(
  $$with updated as (
      update public.comments set body = 'tampered'
        where id = current_setting('test.top_id')::uuid
      returning id
    ) select count(*)::int from updated$$,
  array[0],
  'non-author UPDATE on another visitor''s comment returns 0 rows (RLS)'
);

-- DELETE another user's comment returns 0 rows
select results_eq(
  $$with deleted as (
      delete from public.comments
        where id = current_setting('test.top_id')::uuid
      returning id
    ) select count(*)::int from deleted$$,
  array[0],
  'non-author DELETE on another visitor''s comment returns 0 rows (RLS)'
);

-- ─── moddatetime trigger declared ──────────────────────────────────
-- Behavioral test (updated_at advances) is impossible inside a single
-- transaction because `now()` is fixed to transaction start, so we
-- assert the trigger exists. The moddatetime extension itself is
-- well-trusted; the "수정됨" UI flag relies on this trigger firing
-- in production where each request is its own transaction.

reset role;
select has_trigger(
  'public', 'comments', 'handle_updated_at',
  'handle_updated_at moddatetime trigger should exist on comments'
);

-- Author can update their own comment under RLS.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.alice_id'))::text,
  true
);

select lives_ok(
  $$update public.comments set body = 'edited body'
    where id = current_setting('test.top_id')::uuid$$,
  'author can update own comment'
);

-- ─── Anon SELECT ───────────────────────────────────────────────────

set local role anon;
select isnt(
  (select count(*)::int from public.comments
    where project_id = current_setting('test.project_id')::uuid),
  0,
  'anon can SELECT comments for a project'
);

select * from finish();
rollback;
