---
title: "pgTAP RLS test fails when seed user is not inserted before assertions"
date: 2026-04-08
category: test-failures
tags: [pgtap, supabase, rls, database]
severity: low
---

## Problem

pgTAP test #11 (`PROFILE-002: Authenticated user can see their own profile`) failed with `have: (0), want: (1)`. The test expected to find 1 profile row for user `...0001`, but got 0.

## Root Cause

pgTAP tests within a file are cumulative — they share state inside a single `BEGIN`/`ROLLBACK` transaction. The test assumed user `...0001` already had a profile, but no `INSERT INTO auth.users` was executed before the RLS assertions. Without the insert, the trigger that creates the profile row never fired.

Test #10 (count of *other* profiles = 0) passed trivially because the table was empty.

## Solution

Added a seed `INSERT INTO auth.users` for user `...0001` before the RLS test block, so the trigger creates the profile row.

## Prevention

- pgTAP tests are cumulative within a file — always verify that required seed data exists before assertions.
- When testing "user can see own row", ensure the row was actually created first.
- Test #N passing with count = 0 on an empty table is a false positive — review whether the assertion is meaningful.

## Related Files

- `supabase/tests/profiles_test.sql`
