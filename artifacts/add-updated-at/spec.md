## Overview

Every domain entity exposes an `updated_at` timestamp that automatically advances on any modification. Clients and downstream systems can rely on a single trustworthy field to detect when a record has changed — useful for caching, sync, and audit scenarios.

## Scope

### Included
- Every domain entity (profile, project, vote, cohort) exposes `updated_at` on read.
- Any successful update to a row automatically advances that row's `updated_at` to the modification time, without the caller having to set it.
- Rows that already existed before this feature ships receive a coherent `updated_at` value (not null, not in the future, never earlier than `created_at`).

### Excluded
- Surfacing `updated_at` in the UI. *Reason: this is an infrastructure change; any product-visible "last updated" label is a separate product decision.*
- Reporting views that project columns from base tables. *Reason: views pass `updated_at` through from the underlying tables; no separate behavior change is intended.*
- Exempting append-only entities (e.g. vote) from the rule. *Reason: uniformity across entities is preferred over per-entity exceptions, per project timestamp convention.*

## Scenarios

### 1. Updating a record advances its updated_at
- **Given** — a record of any updatable domain entity (profile, project) exists with `updated_at` value `T0`
- **When** — the owner performs an update on that record (e.g. changes display name, edits title)
- **Then** — a subsequent read returns an `updated_at` strictly greater than `T0`

Success Criteria:
- [ ] After a profile update, a subsequent read returns `updated_at > T0`
- [ ] After a project update, a subsequent read returns `updated_at > T0`
- [ ] Two updates to the same row in sequence produce strictly increasing `updated_at` values

### 2. Insert sets updated_at to the insert moment
- **Given** — a client inserts a new row of any domain entity
- **When** — the row is subsequently read
- **Then** — the row's `updated_at` equals (or is within a trivial delta of) `created_at`

Success Criteria:
- [ ] For a freshly inserted row, `updated_at` is non-null
- [ ] For a freshly inserted row, `updated_at` is within 1 second of `created_at`

### 3. Every domain entity exposes updated_at on read
- **Given** — at least one row exists in each domain entity (profile, project, vote, cohort)
- **When** — a client queries each entity through the public API
- **Then** — every returned row includes a non-null `updated_at` timestamp

Success Criteria:
- [ ] A read of profile, project, vote, and cohort all return rows containing `updated_at`
- [ ] `updated_at` is always a valid ISO timestamp in UTC (timestamptz)

### 4. Pre-existing rows have a coherent updated_at after backfill
- **Given** — rows that existed before this feature shipped (in cohort and vote, which previously had no `updated_at`)
- **When** — a client reads any of those pre-existing rows
- **Then** — each row returns a non-null `updated_at` that is not in the future and is ≥ `created_at`

Success Criteria:
- [ ] For every pre-existing cohort and vote row, `updated_at` is non-null
- [ ] For every pre-existing row, `updated_at ≥ created_at`
- [ ] No pre-existing row returns an `updated_at` later than the moment of migration

### 5. Caller-supplied updated_at cannot override the automatic value
- **Given** — a client attempts to update a row while explicitly sending an `updated_at` value far in the past or future
- **When** — the update completes
- **Then** — the persisted `updated_at` reflects the server's modification moment, not the client's supplied value

Success Criteria:
- [ ] After an update where the client sent `updated_at = '2000-01-01'`, a subsequent read shows `updated_at` near the server's current time, not `'2000-01-01'`

## Invariants

- **Data consistency**: for every row in every domain entity, `updated_at` is non-null, is a UTC timestamp with timezone, and is always ≥ `created_at`.
- **Monotonicity per row**: a row's `updated_at` never decreases across its lifetime — each successful update advances it.
- **Uniformity**: all domain entities expose `updated_at` under identical semantics, regardless of how often updates happen in practice.

## Dependencies

- Existing domain entities: profile, project, vote, cohort.
- Postgres `moddatetime` extension (available in the managed Supabase environment).

## Undecided Items

- (None — all scoping decisions were resolved during specification.)
