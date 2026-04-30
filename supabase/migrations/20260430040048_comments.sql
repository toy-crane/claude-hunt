create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "user_id" uuid not null,
    "parent_comment_id" uuid,
    "body" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."comments" enable row level security;

CREATE INDEX comments_parent_comment_id_idx ON public.comments USING btree (parent_comment_id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE INDEX comments_project_id_idx ON public.comments USING btree (project_id);

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."comments" add constraint "comments_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1000))) not valid;

alter table "public"."comments" validate constraint "comments_body_check";

alter table "public"."comments" add constraint "comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_parent_comment_id_fkey";

alter table "public"."comments" add constraint "comments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_project_id_fkey";

alter table "public"."comments" add constraint "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_comment_depth_1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_parent_parent_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent_comment_id into v_parent_parent_id
    from public.comments
   where id = new.parent_comment_id;

  if v_parent_parent_id is not null then
    raise exception 'reply-to-reply is not allowed (max depth 1)'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$
;

grant delete on table "public"."comments" to "anon";
grant insert on table "public"."comments" to "anon";
grant references on table "public"."comments" to "anon";
grant select on table "public"."comments" to "anon";
grant trigger on table "public"."comments" to "anon";
grant truncate on table "public"."comments" to "anon";
grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";
grant insert on table "public"."comments" to "authenticated";
grant references on table "public"."comments" to "authenticated";
grant select on table "public"."comments" to "authenticated";
grant trigger on table "public"."comments" to "authenticated";
grant truncate on table "public"."comments" to "authenticated";
grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";
grant insert on table "public"."comments" to "service_role";
grant references on table "public"."comments" to "service_role";
grant select on table "public"."comments" to "service_role";
grant trigger on table "public"."comments" to "service_role";
grant truncate on table "public"."comments" to "service_role";
grant update on table "public"."comments" to "service_role";


create policy "Anyone can view comments"
  on "public"."comments"
  as permissive
  for select
  to anon, authenticated
  using (true);


create policy "Authenticated users can insert their own comments"
  on "public"."comments"
  as permissive
  for insert
  to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Owners can delete their own comments"
  on "public"."comments"
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Owners can update their own comments"
  on "public"."comments"
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));


CREATE TRIGGER enforce_comment_depth_1_before_insert BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_depth_1();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');
