  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "cohort_id" uuid not null,
    "title" text not null,
    "tagline" text not null,
    "project_url" text not null,
    "screenshot_path" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."projects" enable row level security;

CREATE INDEX projects_cohort_id_idx ON public.projects USING btree (cohort_id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE INDEX projects_user_id_idx ON public.projects USING btree (user_id);

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."projects" add constraint "projects_cohort_id_fkey" FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE RESTRICT not valid;

alter table "public"."projects" validate constraint "projects_cohort_id_fkey";

alter table "public"."projects" add constraint "projects_project_url_check" CHECK ((project_url ~* '^https?://'::text)) not valid;

alter table "public"."projects" validate constraint "projects_project_url_check";

alter table "public"."projects" add constraint "projects_screenshot_path_check" CHECK ((char_length(screenshot_path) > 0)) not valid;

alter table "public"."projects" validate constraint "projects_screenshot_path_check";

alter table "public"."projects" add constraint "projects_tagline_check" CHECK (((char_length(tagline) >= 1) AND (char_length(tagline) <= 140))) not valid;

alter table "public"."projects" validate constraint "projects_tagline_check";

alter table "public"."projects" add constraint "projects_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 80))) not valid;

alter table "public"."projects" validate constraint "projects_title_check";

alter table "public"."projects" add constraint "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_user_id_fkey";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";


  create policy "Anyone can view projects"
  on "public"."projects"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Owners can delete their own projects"
  on "public"."projects"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Owners can insert their own projects"
  on "public"."projects"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Owners can update their own projects"
  on "public"."projects"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


