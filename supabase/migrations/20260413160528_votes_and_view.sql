  create table "public"."votes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "project_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."votes" enable row level security;

CREATE UNIQUE INDEX votes_pkey ON public.votes USING btree (id);

CREATE INDEX votes_project_id_idx ON public.votes USING btree (project_id);

CREATE UNIQUE INDEX votes_user_id_project_id_key ON public.votes USING btree (user_id, project_id);

alter table "public"."votes" add constraint "votes_pkey" PRIMARY KEY using index "votes_pkey";

alter table "public"."votes" add constraint "votes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."votes" validate constraint "votes_project_id_fkey";

alter table "public"."votes" add constraint "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."votes" validate constraint "votes_user_id_fkey";

alter table "public"."votes" add constraint "votes_user_id_project_id_key" UNIQUE using index "votes_user_id_project_id_key";

create or replace view "public"."projects_with_vote_count" as  SELECT p.id,
    p.user_id,
    p.cohort_id,
    c.name AS cohort_name,
    p.title,
    p.tagline,
    p.project_url,
    p.screenshot_path,
    p.created_at,
    p.updated_at,
    COALESCE(vc.count, (0)::bigint) AS vote_count,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url
   FROM (((public.projects p
     LEFT JOIN public.cohorts c ON ((c.id = p.cohort_id)))
     LEFT JOIN public.profiles pr ON ((pr.id = p.user_id)))
     LEFT JOIN ( SELECT votes.project_id,
            count(*) AS count
           FROM public.votes
          GROUP BY votes.project_id) vc ON ((vc.project_id = p.id)));


grant delete on table "public"."votes" to "anon";

grant insert on table "public"."votes" to "anon";

grant references on table "public"."votes" to "anon";

grant select on table "public"."votes" to "anon";

grant trigger on table "public"."votes" to "anon";

grant truncate on table "public"."votes" to "anon";

grant update on table "public"."votes" to "anon";

grant delete on table "public"."votes" to "authenticated";

grant insert on table "public"."votes" to "authenticated";

grant references on table "public"."votes" to "authenticated";

grant select on table "public"."votes" to "authenticated";

grant trigger on table "public"."votes" to "authenticated";

grant truncate on table "public"."votes" to "authenticated";

grant update on table "public"."votes" to "authenticated";

grant delete on table "public"."votes" to "service_role";

grant insert on table "public"."votes" to "service_role";

grant references on table "public"."votes" to "service_role";

grant select on table "public"."votes" to "service_role";

grant trigger on table "public"."votes" to "service_role";

grant truncate on table "public"."votes" to "service_role";

grant update on table "public"."votes" to "service_role";


  create policy "Anyone can view votes"
  on "public"."votes"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Users can delete their own votes"
  on "public"."votes"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can insert their own votes"
  on "public"."votes"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));


grant select on table "public"."projects_with_vote_count" to "anon";

grant select on table "public"."projects_with_vote_count" to "authenticated";


