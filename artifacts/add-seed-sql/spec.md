## Overview
Move cohort initial data from a migration into a declarative seed file, and split cohort identity from cohort display so a fresh local database ends up with four course cohorts — each with a stable slug for lookup and a Korean label for display in the UI.

## Scope

### Included
- A seed mechanism that, after resetting the local database, provides exactly four cohorts whose slug identifiers are `LGE-1`, `LGE-2`, `LGE-3`, `Inflearn`.
- A human-readable label per cohort, visible to end users in place of the slug:
  - `LGE-1` → `LG전자 1기`
  - `LGE-2` → `LG전자 2기`
  - `LGE-3` → `LG전자 3기`
  - `Inflearn` → `인프런`
- Removal of the previous cohort insertion from migration history so cohorts have exactly one source of truth.
- The seed is safe to re-run on an already-seeded database without error or duplicates.

### Excluded
- Seeding users, profiles, projects, or votes. Reason: the user asked for cohorts only; other data is created through the real app flows during development.
- Seeding the remote/production database. Reason: the seed mechanism targets local development only; production cohort provisioning is a separate concern.
- Changing how cohort text appears on project cards or anywhere outside the onboarding cohort selector and the cohort filter dropdown. Reason: no production UI currently renders a per-project cohort label; rolling that out is a future feature.

## Scenarios

### 1. Fresh local database brings up all four cohorts with their labels
- **Given** a developer has a clean local environment
- **When** they reset the local database and open the app
- **Then** the app's cohort selection surfaces (onboarding cohort selector and the project-board cohort filter) show exactly these four Korean labels: `LG전자 1기`, `LG전자 2기`, `LG전자 3기`, `인프런`
- **And** server-side code that looks up a cohort by its stable slug can still resolve `LGE-1`, `LGE-2`, `LGE-3`, `Inflearn`

Success Criteria:
- [ ] After a fresh local database reset, a query returning `(slug, display-label)` pairs for every cohort returns exactly the set `{('LGE-1','LG전자 1기'), ('LGE-2','LG전자 2기'), ('LGE-3','LG전자 3기'), ('Inflearn','인프런')}` (order not required)
- [ ] The onboarding cohort selector shows exactly those four display labels and no others, with the raw slugs never appearing in user-visible text
- [ ] The project-board cohort filter shows exactly those four display labels and no others
- [ ] A server-side lookup by slug `LGE-1` still returns a single cohort row (proving slug-based code paths are unaffected by the display change)

### 2. Seeding is idempotent
- **Given** the local database has already been seeded with the four cohorts
- **When** the seed is applied again (e.g., another reset, or the seed runs twice)
- **Then** the final state still contains exactly those four cohorts — no duplicates, no errors

Success Criteria:
- [ ] Running the seed a second time against an already-seeded database completes without error
- [ ] After the second run, the count of cohorts with those four slugs is still 4 (no duplicates)

### 3. Cohort data has a single source of truth
- **Given** the project previously inserted cohorts through a migration
- **When** a developer resets the database from scratch
- **Then** cohort rows are populated by the seed mechanism only — the migration history no longer contains cohort insertions

Success Criteria:
- [ ] Searching migration history for cohort `INSERT` statements returns no matches
- [ ] Disabling the seed mechanism on a fresh reset leaves the cohort table empty (proving the migration is no longer a source)

## Invariants
- **Data consistency:** the cohort slug remains unique; every cohort row must carry both a slug identifier and a display label — neither may be empty. The seed must never create two rows with the same slug or leave a label blank.
- **Scope boundary:** the seed affects only cohort data. No other table's contents change as a result of seeding.
- **Identifier stability:** slugs (`LGE-1`, `LGE-2`, `LGE-3`, `Inflearn`) remain the values used by tests, URLs, and server-side lookups. Labels are for human display only and may change later without forcing code changes at lookup sites.

## Dependencies
- The cohort table and its uniqueness constraint on the slug column already exist in the schema.
- The local development tooling supports loading a declarative seed after migrations on database reset.

## Undecided Items
- None.
