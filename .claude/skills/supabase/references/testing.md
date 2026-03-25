---
title: Database Testing with pgTAP
description: Patterns for writing pgTAP tests, simulating user roles, application-level testing, and CI/CD setup
---

# Database Testing with pgTAP

## Overview

pgTAP is a unit testing framework for Postgres that runs directly in the database. It tests table structure, RLS policies, functions, triggers, and data integrity.

## Creating and Running Tests

```bash
# Create a new test file in supabase/tests/
supabase test new <name>.test

# Run all database tests
supabase test db
```

## Test File Structure

Every test file follows this pattern:

```sql
BEGIN;

-- Install pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Declare number of test cases
SELECT plan(N);

-- ... test cases ...

SELECT * FROM finish();
ROLLBACK;
```

The `BEGIN`/`ROLLBACK` wrapper ensures test isolation — no test data persists after the run.

## Testing Patterns

### Table and Column Existence

```sql
SELECT has_table('public', 'profiles', 'profiles table should exist');
SELECT has_column('public', 'profiles', 'id', 'should have id column');
SELECT has_column('public', 'profiles', 'created_at', 'should have created_at column');
SELECT has_column('public', 'profiles', 'updated_at', 'should have updated_at column');
```

### RLS Policy Testing

Simulate different user roles and verify access:

```sql
-- Test as authenticated user
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT results_eq(
  'SELECT count(*)::int FROM profiles WHERE id != ''00000000-0000-0000-0000-000000000001''::uuid',
  ARRAY[0],
  'Authenticated user cannot see other profiles'
);

-- Test as anonymous user
SET local role anon;
SELECT results_eq(
  'SELECT count(*)::int FROM profiles',
  ARRAY[0],
  'Anonymous user cannot see any profiles'
);
```

### RLS is Enabled

```sql
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
  true,
  'RLS should be enabled on profiles'
);
```

### Trigger Testing

```sql
-- Reset role for direct table access
RESET role;

-- Insert into auth.users to trigger profile creation
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000099',
      'test@example.com',
      '{"full_name": "Test User", "avatar_url": "https://example.com/avatar.png"}'::jsonb,
      '{"provider": "google"}'::jsonb,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000',
      now(),
      now()
    )$$,
  'Inserting into auth.users should succeed'
);

-- Verify trigger created the profile
SELECT results_eq(
  $$SELECT display_name FROM profiles WHERE id = '00000000-0000-0000-0000-000000000099'$$,
  ARRAY['Test User'::text],
  'Trigger should create profile with display_name from user metadata'
);
```

### Function Existence

```sql
SELECT has_function('public', 'handle_new_user', 'function should exist');
SELECT has_trigger('auth', 'users', 'on_auth_user_created', 'trigger should exist');
```

## Application-Level Testing

For end-to-end testing through application code (TypeScript with Vitest):

```typescript
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, beforeAll } from 'vitest'
import crypto from 'crypto'

describe('RLS Policies', () => {
  const USER_ID = crypto.randomUUID()
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!)

  beforeAll(async () => {
    // Use service role for setup
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SERVICE_ROLE_KEY!)
    await admin.auth.admin.createUser({
      id: USER_ID,
      email: `test-${USER_ID}@test.com`,
      password: 'password123',
      email_confirm: true,
    })
  })

  it('user can only see their own data', async () => {
    await supabase.auth.signInWithPassword({
      email: `test-${USER_ID}@test.com`,
      password: 'password123',
    })
    const { data } = await supabase.from('profiles').select('*')
    data?.forEach((row) => expect(row.id).toBe(USER_ID))
  })
})
```

Key difference from pgTAP: application-level tests cannot use transactions for isolation. Use unique UUIDs per test suite instead of relying on a clean database state.

## CI/CD Setup

GitHub Actions workflow for automated database testing:

```yaml
# .github/workflows/db-tests.yml
name: Database Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      - name: Start Supabase
        run: supabase start
      - name: Run Tests
        run: supabase test db
```

## Best Practices

- **Test both positive and negative cases**: verify what users CAN do and what they CANNOT do
- **Test all roles**: `authenticated`, `anon`, and service role behavior
- **Use `begin`/`rollback`** in pgTAP tests for isolation
- **Use unique UUIDs** in application-level tests for isolation
- **Test CRUD operations**: Create, Read, Update, Delete for each RLS policy
- **Test edge cases**: empty results, boundary conditions, potential security bypasses
- **Keep tests fast**: use transactions, avoid unnecessary setup
