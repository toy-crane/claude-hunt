create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at
  before update on public.cohorts
  for each row
  execute procedure moddatetime (updated_at);
