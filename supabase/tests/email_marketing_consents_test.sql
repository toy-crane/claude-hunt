-- pgTAP tests for member email marketing consent:
--   explicit onboarding choice, settings opt-in/withdrawal, one-time notice
--   dismissal, owner-only RLS, and account-deletion cascade.

BEGIN;
SELECT plan(30);

-- 1-11. Schema shape and database-owned behavior.
SELECT has_table(
  'public', 'email_marketing_consents',
  'email_marketing_consents table should exist'
);
SELECT has_column('public', 'email_marketing_consents', 'user_id', 'consents should have user_id');
SELECT has_column('public', 'email_marketing_consents', 'is_opted_in', 'consents should have is_opted_in');
SELECT has_column('public', 'email_marketing_consents', 'decided_at', 'consents should have decided_at');
SELECT has_column('public', 'email_marketing_consents', 'consented_at', 'consents should have consented_at');
SELECT has_column('public', 'email_marketing_consents', 'withdrawn_at', 'consents should have withdrawn_at');
SELECT has_column('public', 'email_marketing_consents', 'consent_version', 'consents should have consent_version');
SELECT has_column('public', 'email_marketing_consents', 'notice_dismissed_at', 'consents should have notice_dismissed_at');
SELECT has_column('public', 'email_marketing_consents', 'created_at', 'consents should have created_at');
SELECT has_column('public', 'email_marketing_consents', 'updated_at', 'consents should have updated_at');
SELECT has_pk(
  'public', 'email_marketing_consents',
  'one consent state should exist per user'
);

-- 12-16. Security and callable public seams.
SELECT is(
  (
    SELECT rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'email_marketing_consents'
  ),
  true,
  'RLS should be enabled on email_marketing_consents'
);
SELECT has_trigger(
  'public', 'email_marketing_consents', 'handle_updated_at',
  'email_marketing_consents should maintain updated_at'
);
SELECT has_function(
  'public', 'complete_onboarding', ARRAY['text', 'uuid', 'boolean', 'text'],
  'complete_onboarding should atomically save profile and consent choice'
);
SELECT has_function(
  'public', 'set_email_marketing_consent', ARRAY['boolean', 'text'],
  'set_email_marketing_consent should be available to settings'
);
SELECT has_function(
  'public', 'dismiss_email_marketing_notice', ARRAY[]::text[],
  'dismiss_email_marketing_notice should persist the one-time dismissal'
);

-- Seed two users. handle_new_user creates their public.profiles rows.
INSERT INTO auth.users (
  id, email, raw_user_meta_data, raw_app_meta_data, aud, role,
  instance_id, created_at, updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000071',
    'marketing-owner@example.com',
    '{}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000072',
    'marketing-other@example.com',
    '{}'::jsonb,
    '{"provider": "email"}'::jsonb,
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000', now(), now()
  );

-- Seed consent rows as the table owner so read RLS and direct-write denial can be tested.
INSERT INTO public.email_marketing_consents (
  user_id, is_opted_in, decided_at
)
VALUES
  ('00000000-0000-0000-0000-000000000071', false, now()),
  ('00000000-0000-0000-0000-000000000072', false, now());

SET local role authenticated;
SET local request.jwt.claims TO
  '{"sub":"00000000-0000-0000-0000-000000000071","email":"marketing-owner@example.com"}';

-- 17-20. Members can read their row but audit fields change only through RPCs.
SELECT results_eq(
  $$SELECT count(*)::int FROM public.email_marketing_consents$$,
  ARRAY[1],
  'Authenticated member can select only their own consent state'
);
SELECT throws_ok(
  $$UPDATE public.email_marketing_consents
    SET consented_at = now(), consent_version = 'fabricated'
    WHERE user_id = '00000000-0000-0000-0000-000000000071'$$,
  '42501',
  NULL,
  'Authenticated member cannot directly fabricate their consent audit fields'
);
SELECT throws_ok(
  $$UPDATE public.email_marketing_consents
    SET is_opted_in = true
    WHERE user_id = '00000000-0000-0000-0000-000000000072'$$,
  '42501',
  NULL,
  'Authenticated member cannot directly update another consent state'
);
SELECT throws_ok(
  $$INSERT INTO public.email_marketing_consents (user_id, is_opted_in)
    VALUES ('00000000-0000-0000-0000-000000000071', false)$$,
  '42501',
  NULL,
  'Authenticated member cannot directly replace the controlled RPC write path'
);

-- 21. Signed-out visitors cannot read this private state.
RESET role;
SET local role anon;
SELECT throws_ok(
  $$SELECT count(*) FROM public.email_marketing_consents$$,
  '42501',
  NULL,
  'Anonymous visitor has no consent-table privileges'
);

-- Reset the owner row so the onboarding function proves both explicit choices.
RESET role;
DELETE FROM public.email_marketing_consents
WHERE user_id = '00000000-0000-0000-0000-000000000071';

SET local role authenticated;
SET local request.jwt.claims TO
  '{"sub":"00000000-0000-0000-0000-000000000071","email":"marketing-owner@example.com"}';

-- 22-23. Unchecked onboarding completes and records an explicit off decision.
SELECT lives_ok(
  $$SELECT public.complete_onboarding(
      '마케팅테스트',
      (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
      false,
      '2026-09-03'
    )$$,
  'Onboarding should complete when optional marketing consent is unchecked'
);
SELECT results_eq(
  $$SELECT concat_ws('|', is_opted_in::text, (decided_at IS NOT NULL)::text,
           (consented_at IS NULL)::text, (consent_version IS NULL)::text)
    FROM public.email_marketing_consents
    WHERE user_id = '00000000-0000-0000-0000-000000000071'$$,
  ARRAY['false|true|true|true'::text],
  'Unchecked onboarding should be a recorded off decision, not a consent'
);

-- 24. Checked onboarding records current consent, time, and copy version.
SELECT lives_ok(
  $$SELECT public.complete_onboarding(
      '마케팅테스트',
      (SELECT id FROM public.cohorts ORDER BY name LIMIT 1),
      true,
      '2026-09-03'
    )$$,
  'Onboarding should complete when marketing consent is checked'
);
SELECT results_eq(
  $$SELECT concat_ws('|', is_opted_in::text, (decided_at IS NOT NULL)::text,
           (consented_at IS NOT NULL)::text, consent_version)
    FROM public.email_marketing_consents
    WHERE user_id = '00000000-0000-0000-0000-000000000071'$$,
  ARRAY['true|true|true|2026-09-03'::text],
  'Checked onboarding should record consent time and copy version'
);

-- 26-27. Settings withdrawal excludes the member; opting in works again.
SELECT lives_ok(
  $$SELECT public.set_email_marketing_consent(false, '2026-09-03')$$,
  'Settings should allow immediate consent withdrawal'
);
SELECT results_eq(
  $$SELECT concat_ws('|', is_opted_in::text, (withdrawn_at IS NOT NULL)::text)
    FROM public.email_marketing_consents
    WHERE user_id = '00000000-0000-0000-0000-000000000071'$$,
  ARRAY['false|true'::text],
  'Withdrawal should turn off sending eligibility and record its time'
);

-- 28. Dismissing the legacy notice is not a marketing decision or consent.
RESET role;
DELETE FROM public.email_marketing_consents
WHERE user_id = '00000000-0000-0000-0000-000000000071';
SET local role authenticated;
SET local request.jwt.claims TO
  '{"sub":"00000000-0000-0000-0000-000000000071","email":"marketing-owner@example.com"}';
SELECT lives_ok(
  $$SELECT public.dismiss_email_marketing_notice()$$,
  'Legacy member can dismiss the notice once'
);
SELECT results_eq(
  $$SELECT concat_ws('|', is_opted_in::text, (decided_at IS NULL)::text,
           (consented_at IS NULL)::text, (notice_dismissed_at IS NOT NULL)::text)
    FROM public.email_marketing_consents
    WHERE user_id = '00000000-0000-0000-0000-000000000071'$$,
  ARRAY['false|true|true|true'::text],
  'Notice dismissal should stay separate from a consent decision'
);

-- 30. Deleting the profile cascades to its private consent record.
RESET role;
DELETE FROM public.profiles
WHERE id = '00000000-0000-0000-0000-000000000071';
SELECT results_eq(
  $$SELECT count(*)::int FROM public.email_marketing_consents
    WHERE user_id = '00000000-0000-0000-0000-000000000071'$$,
  ARRAY[0],
  'Deleting a profile should cascade to its consent state'
);

SELECT * FROM finish();
ROLLBACK;
