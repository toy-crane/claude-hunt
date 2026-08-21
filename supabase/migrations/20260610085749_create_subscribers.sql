  create table "public"."subscribers" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "source" text not null default 'landing'::text,
    "consented_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."subscribers" enable row level security;

CREATE UNIQUE INDEX subscribers_email_unique ON public.subscribers USING btree (lower(email));

CREATE UNIQUE INDEX subscribers_pkey ON public.subscribers USING btree (id);

alter table "public"."subscribers" add constraint "subscribers_pkey" PRIMARY KEY using index "subscribers_pkey";

grant delete on table "public"."subscribers" to "service_role";

grant insert on table "public"."subscribers" to "service_role";

grant references on table "public"."subscribers" to "service_role";

grant select on table "public"."subscribers" to "service_role";

grant trigger on table "public"."subscribers" to "service_role";

grant truncate on table "public"."subscribers" to "service_role";

grant update on table "public"."subscribers" to "service_role";

-- 서버 전용(service_role) 테이블: create table 시 default privileges가 부여한
-- anon/authenticated 권한을 회수한다. migra는 이 revoke를 emit하지 못해
-- 직접 보강한다 (see .claude/rules/supabase-migration.md).
revoke all on table "public"."subscribers" from anon, authenticated;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.subscribers FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');
