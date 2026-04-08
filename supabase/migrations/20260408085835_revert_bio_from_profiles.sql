-- Revert test migration: remove bio column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bio;
