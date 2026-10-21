-- One row per background highlight-capture run (the model-driven agent that
-- fills a project's gallery after an automatic first-screen capture). The
-- server writes these with the service role; rows feed the per-user daily
-- run limit and let operators see what the agent did. First-screen captures
-- use no model and are not recorded here.
create table public.project_capture_runs (
  id uuid not null default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  images_added smallint not null default 0 check (images_added between 0 and 4),
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_capture_runs_user_id_created_at_idx
  on public.project_capture_runs (user_id, created_at desc);
create index project_capture_runs_project_id_idx
  on public.project_capture_runs (project_id);

alter table public.project_capture_runs enable row level security;

-- Server-only table: no client role may read or write it, and no RLS policy
-- is declared because only the service role (which bypasses RLS) touches it.
revoke all on table public.project_capture_runs from PUBLIC, anon, authenticated, service_role;
grant select, insert, update, delete on table public.project_capture_runs to service_role;

create trigger handle_updated_at
  before update on public.project_capture_runs
  for each row
  execute procedure extensions.moddatetime (updated_at);

-- Appends one automatically captured image to a project's gallery, but only
-- while the gallery still equals what the capture run last saw and has room.
-- Returns false when the owner changed the images in the meantime (the late
-- capture is discarded) or the gallery is already full.
create or replace function public.append_project_auto_image(
  p_project_id uuid,
  p_expected_images jsonb,
  p_image jsonb
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with appended as (
    update public.projects
    set images = images || jsonb_build_array(p_image)
    where id = p_project_id
      and images = p_expected_images
      and jsonb_array_length(images) < 5
    returning 1
  )
  select exists (select 1 from appended);
$$;

revoke all on function public.append_project_auto_image(uuid, jsonb, jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.append_project_auto_image(uuid, jsonb, jsonb) to service_role;
