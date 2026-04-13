-- RLS policies on storage.objects for the `project-screenshots` bucket.
-- Declared via manual migration (per .claude/rules/supabase-migration.md:
-- "RLS on storage.objects → manual migration"; supabase db diff cannot
-- capture policies in the `storage` schema).
--
-- Bucket itself (public = true, 5 MiB cap, JPEG/PNG/WebP allow-list) is
-- declared in supabase/config.toml.

-- Anyone (including anon) can read objects in this bucket so the grid's
-- screenshots render for public visitors.
create policy "Public can read project-screenshots"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-screenshots');

-- Authenticated users can upload only when they claim ownership. Storage
-- sets owner = auth.uid() automatically when uploading via the client
-- SDK; this policy enforces the same invariant at the DB level so a
-- hand-crafted request cannot spoof another user's upload.
create policy "Authenticated can upload own project-screenshots"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-screenshots'
    and owner = (select auth.uid())
  );

-- Owners can replace their own objects (e.g. swap a screenshot on edit).
create policy "Owners can update their project-screenshots"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-screenshots'
    and owner = (select auth.uid())
  )
  with check (
    bucket_id = 'project-screenshots'
    and owner = (select auth.uid())
  );

-- Owners can delete their own objects (e.g. on project delete).
create policy "Owners can delete their project-screenshots"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-screenshots'
    and owner = (select auth.uid())
  );
