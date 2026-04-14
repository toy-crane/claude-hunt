-- Case-insensitive, trim-aware uniqueness on public.profiles.display_name.
-- Comparison ignores letter case and surrounding whitespace so that
-- 'Alice', 'alice', and '  Alice  ' all map to the same key. The stored
-- column keeps the original casing — only the index expression is
-- normalized. NULL display_names remain distinct under a unique index,
-- which matches the pre-onboarding state where display_name is unset.
CREATE UNIQUE INDEX profiles_display_name_ci_unique
  ON public.profiles USING btree (lower(btrim(display_name)));
