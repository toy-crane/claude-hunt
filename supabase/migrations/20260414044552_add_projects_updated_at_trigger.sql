create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at
  before update on public.projects
  for each row
  execute procedure extensions.moddatetime (updated_at);
