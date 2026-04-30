create table public.comments (
  id uuid not null default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid null references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_project_id_idx on public.comments (project_id);
create index comments_parent_comment_id_idx on public.comments (parent_comment_id);

alter table public.comments enable row level security;

create policy "Anyone can view comments"
  on public.comments for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert their own comments"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update their own comments"
  on public.comments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete their own comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Hard-cap reply depth at 1 — replies to a reply are rejected at the
-- DB layer so a crafted client request cannot bypass the UI's
-- "no reply-to-reply" rule.
create or replace function public.enforce_comment_depth_1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_parent_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent_comment_id into v_parent_parent_id
    from public.comments
   where id = new.parent_comment_id;

  if v_parent_parent_id is not null then
    raise exception 'reply-to-reply is not allowed (max depth 1)'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger enforce_comment_depth_1_before_insert
  before insert on public.comments
  for each row
  execute function public.enforce_comment_depth_1();

create trigger handle_updated_at
  before update on public.comments
  for each row
  execute procedure extensions.moddatetime (updated_at);
