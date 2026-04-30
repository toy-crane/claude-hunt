create table public.comment_reactions (
  id uuid not null default gen_random_uuid() primary key,
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '💡', '🎉', '❤️')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comment_id, user_id, emoji)
);

create index comment_reactions_comment_id_idx on public.comment_reactions (comment_id);

alter table public.comment_reactions enable row level security;

create policy "Anyone can view comment reactions"
  on public.comment_reactions for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert their own reactions"
  on public.comment_reactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete their own reactions"
  on public.comment_reactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger handle_updated_at
  before update on public.comment_reactions
  for each row
  execute procedure extensions.moddatetime (updated_at);
