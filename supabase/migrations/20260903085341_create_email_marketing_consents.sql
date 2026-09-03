create table public.email_marketing_consents (
  user_id uuid not null references public.profiles(id) on delete cascade primary key,
  is_opted_in boolean not null default false,
  decided_at timestamptz,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  consent_version text,
  notice_dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_marketing_consents_active_consent_check check (
    not is_opted_in
    or (
      decided_at is not null
      and consented_at is not null
      and consent_version is not null
    )
  )
);

alter table public.email_marketing_consents enable row level security;

revoke all on table public.email_marketing_consents
  from PUBLIC, anon, authenticated, service_role;
grant select on table public.email_marketing_consents to authenticated;
grant select, insert, update, delete on table public.email_marketing_consents
  to service_role;

create policy "Users can view their own email marketing consent"
  on public.email_marketing_consents for select
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger handle_updated_at
  before update on public.email_marketing_consents
  for each row
  execute procedure extensions.moddatetime (updated_at);

create or replace function public.complete_onboarding(
  p_display_name text,
  p_cohort_id uuid,
  p_marketing_opted_in boolean,
  p_consent_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := (select auth.jwt() ->> 'email');
  decision_time timestamptz := clock_timestamp();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.profiles (id, email, display_name, cohort_id)
  values (current_user_id, current_email, btrim(p_display_name), p_cohort_id)
  on conflict (id) do update set
    display_name = excluded.display_name,
    cohort_id = excluded.cohort_id;

  insert into public.email_marketing_consents (
    user_id,
    is_opted_in,
    decided_at,
    consented_at,
    withdrawn_at,
    consent_version
  )
  values (
    current_user_id,
    p_marketing_opted_in,
    decision_time,
    case when p_marketing_opted_in then decision_time else null end,
    null,
    case when p_marketing_opted_in then p_consent_version else null end
  )
  on conflict (user_id) do update set
    is_opted_in = excluded.is_opted_in,
    decided_at = excluded.decided_at,
    consented_at = excluded.consented_at,
    withdrawn_at = excluded.withdrawn_at,
    consent_version = excluded.consent_version;
end;
$$;

create or replace function public.set_email_marketing_consent(
  p_opted_in boolean,
  p_consent_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  decision_time timestamptz := clock_timestamp();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.email_marketing_consents (
    user_id,
    is_opted_in,
    decided_at,
    consented_at,
    withdrawn_at,
    consent_version
  )
  values (
    current_user_id,
    p_opted_in,
    decision_time,
    case when p_opted_in then decision_time else null end,
    case when p_opted_in then null else decision_time end,
    case when p_opted_in then p_consent_version else null end
  )
  on conflict (user_id) do update set
    is_opted_in = excluded.is_opted_in,
    decided_at = excluded.decided_at,
    consented_at = case
      when excluded.is_opted_in then excluded.consented_at
      else public.email_marketing_consents.consented_at
    end,
    withdrawn_at = case
      when excluded.is_opted_in then public.email_marketing_consents.withdrawn_at
      else excluded.withdrawn_at
    end,
    consent_version = case
      when excluded.is_opted_in then excluded.consent_version
      else public.email_marketing_consents.consent_version
    end;
end;
$$;

create or replace function public.dismiss_email_marketing_notice()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.email_marketing_consents (user_id, notice_dismissed_at)
  values (current_user_id, clock_timestamp())
  on conflict (user_id) do update set
    notice_dismissed_at = coalesce(
      public.email_marketing_consents.notice_dismissed_at,
      excluded.notice_dismissed_at
    );
end;
$$;

revoke execute on function public.complete_onboarding(text, uuid, boolean, text)
  from PUBLIC, anon;
revoke execute on function public.set_email_marketing_consent(boolean, text)
  from PUBLIC, anon;
revoke execute on function public.dismiss_email_marketing_notice()
  from PUBLIC, anon;

grant execute on function public.complete_onboarding(text, uuid, boolean, text)
  to authenticated;
grant execute on function public.set_email_marketing_consent(boolean, text)
  to authenticated;
grant execute on function public.dismiss_email_marketing_notice()
  to authenticated;
