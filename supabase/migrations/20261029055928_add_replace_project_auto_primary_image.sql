-- Replaces a project's primary image with an automatically captured screen
-- taken after the capture run got past a sign-in wall. The generated diff
-- also carried unrelated grant, view, trigger, and Storage policy churn from
-- the diff engine; only the new function and its privileges belong here.

create or replace function public.replace_project_auto_primary_image(
  p_project_id uuid,
  p_expected_images jsonb,
  p_image jsonb
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with replaced as (
    update public.projects
    set images = jsonb_set(images, '{0}', p_image)
    where id = p_project_id
      and images = p_expected_images
      and jsonb_array_length(images) > 0
    returning 1
  )
  select exists (select 1 from replaced);
$$;

revoke all on function public.replace_project_auto_primary_image(uuid, jsonb, jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.replace_project_auto_primary_image(uuid, jsonb, jsonb) to service_role;
