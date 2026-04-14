alter table "public"."cohorts" add column "label" text not null;

alter table "public"."cohorts" add column "updated_at" timestamp with time zone not null default now();
