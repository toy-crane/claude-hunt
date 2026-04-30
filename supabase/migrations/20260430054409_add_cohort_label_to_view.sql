drop view if exists "public"."projects_with_vote_count";

create view "public"."projects_with_vote_count"
with (security_invoker = false) as
 SELECT p.id,
    p.user_id,
    p.cohort_id,
    c.name AS cohort_name,
    c.label AS cohort_label,
    p.title,
    p.tagline,
    p.project_url,
    p.github_url,
    p.screenshot_path,
    p.images,
    COALESCE(((p.images -> 0) ->> 'path'::text), p.screenshot_path) AS primary_image_path,
    p.created_at,
    p.updated_at,
    p.vote_count,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url
   FROM ((public.projects p
     LEFT JOIN public.cohorts c ON ((c.id = p.cohort_id)))
     LEFT JOIN public.profiles pr ON ((pr.id = p.user_id)));

grant select on public.projects_with_vote_count to anon, authenticated;
