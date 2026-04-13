drop policy "Users can view their own profile" on "public"."profiles";


  create table "public"."cohorts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."cohorts" enable row level security;

alter table "public"."profiles" add column "cohort_id" uuid;

CREATE UNIQUE INDEX cohorts_name_key ON public.cohorts USING btree (name);

CREATE UNIQUE INDEX cohorts_pkey ON public.cohorts USING btree (id);

alter table "public"."cohorts" add constraint "cohorts_pkey" PRIMARY KEY using index "cohorts_pkey";

alter table "public"."cohorts" add constraint "cohorts_name_key" UNIQUE using index "cohorts_name_key";

alter table "public"."profiles" add constraint "profiles_cohort_id_fkey" FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_cohort_id_fkey";

grant delete on table "public"."cohorts" to "anon";

grant insert on table "public"."cohorts" to "anon";

grant references on table "public"."cohorts" to "anon";

grant select on table "public"."cohorts" to "anon";

grant trigger on table "public"."cohorts" to "anon";

grant truncate on table "public"."cohorts" to "anon";

grant update on table "public"."cohorts" to "anon";

grant delete on table "public"."cohorts" to "authenticated";

grant insert on table "public"."cohorts" to "authenticated";

grant references on table "public"."cohorts" to "authenticated";

grant select on table "public"."cohorts" to "authenticated";

grant trigger on table "public"."cohorts" to "authenticated";

grant truncate on table "public"."cohorts" to "authenticated";

grant update on table "public"."cohorts" to "authenticated";

grant delete on table "public"."cohorts" to "service_role";

grant insert on table "public"."cohorts" to "service_role";

grant references on table "public"."cohorts" to "service_role";

grant select on table "public"."cohorts" to "service_role";

grant trigger on table "public"."cohorts" to "service_role";

grant truncate on table "public"."cohorts" to "service_role";

grant update on table "public"."cohorts" to "service_role";


  create policy "Anyone can view cohorts"
  on "public"."cohorts"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Authenticated users can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);


