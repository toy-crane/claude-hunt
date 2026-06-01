drop view if exists "public"."projects_with_vote_count";

alter table "public"."projects" add column "description" text;

alter table "public"."projects" add constraint "projects_description_check" CHECK (((description IS NULL) OR ((char_length(description) >= 1) AND (char_length(description) <= 1000)))) not valid;

alter table "public"."projects" validate constraint "projects_description_check";

-- security_invoker = false + the anon/authenticated grant are restored by hand:
-- migra drops the view to reorder columns, which loses both, and it does not
-- re-emit grants/view options (see .claude/rules/supabase-migration.md).
create or replace view "public"."projects_with_vote_count" with (security_invoker = false) as  SELECT p.id,
    p.user_id,
    p.cohort_id,
    c.name AS cohort_name,
    c.label AS cohort_label,
    p.title,
    p.tagline,
    p.description,
    p.project_url,
    p.github_url,
    p.images,
    ((p.images -> 0) ->> 'path'::text) AS primary_image_path,
    p.created_at,
    p.updated_at,
    p.vote_count,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url
   FROM ((public.projects p
     LEFT JOIN public.cohorts c ON ((c.id = p.cohort_id)))
     LEFT JOIN public.profiles pr ON ((pr.id = p.user_id)));

grant select on "public"."projects_with_vote_count" to anon, authenticated;
