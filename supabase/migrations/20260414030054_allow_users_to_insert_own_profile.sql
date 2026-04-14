-- Allow authenticated users to INSERT their own profile row. Needed so
-- the onboarding server action can `upsert` into `profiles` and still
-- succeed when the `handle_new_user` trigger has not populated a row
-- (e.g. after a local `supabase db reset` that wipes `public.profiles`
-- but leaves `auth.users` intact, or any path where the INSERT-on-
-- auth-signup trigger did not fire).
--
-- The policy is strictly scoped: a user can only insert a row whose
-- `id` matches their own `auth.uid()`, preserving the invariant that
-- profiles are 1:1 with auth users and that no user can create a
-- profile on behalf of another user.

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);
