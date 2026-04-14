-- Add updated_at to votes. As with add_updated_at_to_cohorts, the
-- declarative `supabase db diff` output included drops for the moddatetime
-- extension, all four handle_updated_at triggers, prevent_self_vote /
-- handle_new_user functions, storage-objects policies, and a destructive
-- recreate of projects_with_vote_count (losing `security_invoker = false`).
-- Those resources live in migrations, not supabase/schemas/, so the tool
-- can't see them. Only the ALTER TABLE is kept.
alter table public.votes
  add column if not exists updated_at timestamptz not null default now();
