begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- ─── Schema: structure ─────────────────────────────────────────────

select has_table('public', 'comment_reactions', 'comment_reactions table should exist');
select has_column('public', 'comment_reactions', 'comment_id', 'should have comment_id');
select has_column('public', 'comment_reactions', 'user_id', 'should have user_id');
select has_column('public', 'comment_reactions', 'emoji', 'should have emoji');

select is(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'comment_reactions'),
  true,
  'RLS should be enabled on comment_reactions'
);

select has_trigger(
  'public', 'comment_reactions', 'handle_updated_at',
  'handle_updated_at moddatetime trigger should exist on comment_reactions'
);

-- ─── Fixture ───────────────────────────────────────────────────────

reset role;

do $$
declare
  v_alice_id uuid;
  v_bob_id uuid;
  v_project_id uuid;
  v_comment_id uuid;
begin
  select id into v_alice_id from public.profiles order by created_at limit 1;
  select id into v_bob_id from public.profiles where id != v_alice_id order by created_at limit 1;
  select id into v_project_id from public.projects order by created_at limit 1;
  if v_alice_id is null or v_bob_id is null or v_project_id is null then
    raise exception 'seed fixtures missing — comment_reactions_test requires 2 profiles and 1 project';
  end if;

  insert into public.comments (project_id, user_id, body)
  values (v_project_id, v_alice_id, 'a comment to react to')
  returning id into v_comment_id;

  perform set_config('test.alice_id', v_alice_id::text, true);
  perform set_config('test.bob_id', v_bob_id::text, true);
  perform set_config('test.comment_id', v_comment_id::text, true);
end $$;

-- ─── emoji CHECK accepts allowlisted, rejects others ───────────────

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.alice_id'))::text,
  true
);

select lives_ok(
  $$insert into public.comment_reactions (comment_id, user_id, emoji)
    values (
      current_setting('test.comment_id')::uuid,
      current_setting('test.alice_id')::uuid,
      '👍'
    )$$,
  'allowlisted emoji 👍 is accepted'
);

select throws_ok(
  $$insert into public.comment_reactions (comment_id, user_id, emoji)
    values (
      current_setting('test.comment_id')::uuid,
      current_setting('test.alice_id')::uuid,
      '🐶'
    )$$,
  '23514',
  null,
  'non-allowlisted emoji 🐶 is rejected by CHECK'
);

-- ─── Composite UNIQUE: same (comment, user, emoji) duplicate rejected ─

select throws_ok(
  $$insert into public.comment_reactions (comment_id, user_id, emoji)
    values (
      current_setting('test.comment_id')::uuid,
      current_setting('test.alice_id')::uuid,
      '👍'
    )$$,
  '23505',
  null,
  'duplicate (comment_id, user_id, emoji) rejected by UNIQUE'
);

-- ─── Same user, different emojis on same comment → both succeed ────

select lives_ok(
  $$insert into public.comment_reactions (comment_id, user_id, emoji)
    values (
      current_setting('test.comment_id')::uuid,
      current_setting('test.alice_id')::uuid,
      '💡'
    )$$,
  'same user can react with a different emoji on the same comment'
);

-- ─── Anon SELECT ───────────────────────────────────────────────────

set local role anon;
select isnt(
  (select count(*)::int from public.comment_reactions
    where comment_id = current_setting('test.comment_id')::uuid),
  0,
  'anon can SELECT comment_reactions'
);

-- ─── Cascade on comment delete ─────────────────────────────────────

reset role;
delete from public.comments where id = current_setting('test.comment_id')::uuid;

select results_eq(
  $$select count(*)::int from public.comment_reactions
    where comment_id = current_setting('test.comment_id')::uuid$$,
  array[0],
  'reactions cascade-deleted when their parent comment is deleted'
);

select * from finish();
rollback;
