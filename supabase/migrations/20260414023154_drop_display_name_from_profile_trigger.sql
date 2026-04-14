-- Remove display_name auto-population from the profile-creation trigger.
-- After this migration, `display_name` starts NULL on signup and is written
-- exclusively by the onboarding flow (feat/onboarding-process). The trigger
-- still captures `full_name` and `avatar_url` from OAuth metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  _full_name text := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name'
  );
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    _full_name,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
