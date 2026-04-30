create table "public"."comment_reactions" (
    "id" uuid not null default gen_random_uuid(),
    "comment_id" uuid not null,
    "user_id" uuid not null,
    "emoji" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."comment_reactions" enable row level security;

CREATE INDEX comment_reactions_comment_id_idx ON public.comment_reactions USING btree (comment_id);

CREATE UNIQUE INDEX comment_reactions_comment_id_user_id_emoji_key ON public.comment_reactions USING btree (comment_id, user_id, emoji);

CREATE UNIQUE INDEX comment_reactions_pkey ON public.comment_reactions USING btree (id);

alter table "public"."comment_reactions" add constraint "comment_reactions_pkey" PRIMARY KEY using index "comment_reactions_pkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_comment_id_fkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_comment_id_user_id_emoji_key" UNIQUE using index "comment_reactions_comment_id_user_id_emoji_key";

alter table "public"."comment_reactions" add constraint "comment_reactions_emoji_check" CHECK ((emoji = ANY (ARRAY['👍'::text, '💡'::text, '🎉'::text, '❤️'::text]))) not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_emoji_check";

alter table "public"."comment_reactions" add constraint "comment_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_user_id_fkey";

grant delete on table "public"."comment_reactions" to "anon";

grant insert on table "public"."comment_reactions" to "anon";

grant references on table "public"."comment_reactions" to "anon";

grant select on table "public"."comment_reactions" to "anon";

grant trigger on table "public"."comment_reactions" to "anon";

grant truncate on table "public"."comment_reactions" to "anon";

grant update on table "public"."comment_reactions" to "anon";

grant delete on table "public"."comment_reactions" to "authenticated";

grant insert on table "public"."comment_reactions" to "authenticated";

grant references on table "public"."comment_reactions" to "authenticated";

grant select on table "public"."comment_reactions" to "authenticated";

grant trigger on table "public"."comment_reactions" to "authenticated";

grant truncate on table "public"."comment_reactions" to "authenticated";

grant update on table "public"."comment_reactions" to "authenticated";

grant delete on table "public"."comment_reactions" to "service_role";

grant insert on table "public"."comment_reactions" to "service_role";

grant references on table "public"."comment_reactions" to "service_role";

grant select on table "public"."comment_reactions" to "service_role";

grant trigger on table "public"."comment_reactions" to "service_role";

grant truncate on table "public"."comment_reactions" to "service_role";

grant update on table "public"."comment_reactions" to "service_role";


  create policy "Anyone can view comment reactions"
  on "public"."comment_reactions"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Authenticated users can insert their own reactions"
  on "public"."comment_reactions"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Owners can delete their own reactions"
  on "public"."comment_reactions"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));


CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.comment_reactions FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');
