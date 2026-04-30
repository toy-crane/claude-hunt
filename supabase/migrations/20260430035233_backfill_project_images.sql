-- Backfill projects.images from the legacy single-image projects.screenshot_path.
-- One-time DML run after the Expand migration adds the `images` column with
-- default '[]'. After this, every existing row has both fields populated:
-- * screenshot_path: legacy value (kept for read-fallback during transition)
-- * images: jsonb array containing one object {"path": <screenshot_path>}
--
-- The follow-up Contract scope drops screenshot_path and the coalesce shim
-- in projects_with_vote_count once all writes go through `images`.
update public.projects
   set images = jsonb_build_array(jsonb_build_object('path', screenshot_path))
 where jsonb_array_length(images) = 0
   and screenshot_path is not null;
