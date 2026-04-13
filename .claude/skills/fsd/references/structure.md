# Folder Structure — Next.js + FSD

```
<repo-root>/
  app/                        # Next.js App Router (routing + page composition)
    layout.tsx                # root layout, wraps core/providers
    page.tsx                  # a route
    <route>/
      page.tsx                # a route page
      route.ts                # a route handler (NOT moved to features)
      loading.tsx             # route-level loading UI
    __tests__/                # page-level integration tests
      <page>.test.tsx

  core/                       # FSD's `app` layer, renamed
    providers/                # <ThemeProvider>, <QueryProvider>, etc.
      <provider>.tsx
      <provider>.test.tsx
    config/                   # side-effectful bootstrap (e.g. analytics.init)

  widgets/                    # Composed UI blocks reused across multiple pages
    <block>/
      ui/<block>.tsx
      ui/<block>.test.tsx
      index.ts                # public API

  features/                   # User-facing actions
    <action>/
      ui/<component>.tsx      # interaction UI
      ui/<component>.test.tsx
      api/actions.ts          # 'use server' actions, fetchers
      api/actions.test.ts
      model/schema.ts         # Zod schema, domain types, hooks
      model/schema.test.ts
      index.ts                # public API

  entities/                   # Domain objects (type + default visual)
    <domain>/
      ui/<object>-card.tsx    # default visual representation
      ui/<object>-card.test.tsx
      model/schema.ts         # narrowed types from @shared/api/<db>/types
      index.ts                # public API

  shared/                     # Domain-agnostic infrastructure
    ui/                       # design system (e.g. shadcn)
      <component>.tsx
      icons/<icon>.tsx
    api/                      # HTTP clients, typed fetchers
      <service>/
        client.ts             # browser
        server.ts             # server
        types.ts              # generated types (e.g. from Supabase)
    lib/                      # pure utilities (format, cn, test-utils)
    config/                   # env validation, constants
    types/                    # global ambient types (rare)

  supabase/                   # Infrastructure (outside FSD tree)
    schemas/<table>.sql       # declarative schemas
    migrations/               # generated via `supabase db diff`
    tests/<table>_test.sql    # pgTAP tests
    config.toml

  proxy.ts                    # Next.js 16 middleware (root file)
```

## Aliases (recommended)

- `@core/*`, `@features/*`, `@entities/*`, `@shared/*` (+ `@widgets/*` if used)
- Configure in `tsconfig.json` `paths` AND `vitest.config.ts` `resolve.alias`. The two must stay in sync.

## Typical file counts per slice

| Layer | Slice | Files (minimum) |
|-------|-------|-----------------|
| features/ | user action | `ui/<component>.tsx`, `api/actions.ts`, `index.ts` (3) |
| entities/ | domain object | `model/schema.ts`, `index.ts` (2) — add `ui/<card>.tsx` when rendering |
| widgets/ | composed block | `ui/<block>.tsx`, `index.ts` (2) |
| core/ | provider | `providers/<name>.tsx` (1) |
| shared/ | utility | 1 file per concern |

Tests are co-located with their source (same folder).
