# Layer Guide — When to Use Each Layer

Listed bottom-up. A new file's home is determined by asking "what is this *for*?", not "what *kind* of file is it?".

## shared/ — Domain-agnostic infrastructure

Use when the code **does not know about any business domain**. Should be copy-pasteable into a different app.

- UI kit (Button, Card, Input, icons) — e.g. shadcn components
- HTTP clients (`shared/api/supabase/{client,server}.ts`)
- Pure utilities (`cn`, `format-date`, `parse-cookie`)
- Test helpers (`shared/lib/test-utils.tsx`)
- Environment validation (`shared/config/env.ts`)
- Generated types from external services (`shared/api/supabase/types.ts`)

**Not shared**: anything that imports a domain type (`Profile`, `Project`) — that belongs in the entity that owns the type.

## entities/ — Domain objects

A noun of your product. One folder per domain. Contains:

- **Narrow types** (`model/schema.ts`) — typically the single place that imports raw DB types
- **Default visual** (`ui/<name>-card.tsx`) — how this object renders without any action

Examples: `Profile`, `Project`, `Vote`, `Cohort`.

**Rules**
- Entities do **not** know about features. `entities/project` has no idea there's an "upvote" feature.
- Entities do **not** import each other (no `entities/vote` importing `entities/project`). If an entity needs another, promote the shared piece to `shared/`.
- An entity without a visual representation can skip the `ui/` segment.

## features/ — User actions

A verb. Something a user *does* that adds business value.

- "Submit a project" → `features/submit-project/`
- "Toggle upvote" → `features/toggle-vote/`
- "Filter by cohort" → `features/filter-by-cohort/`
- "Send magic link" → `features/auth-login/`

**Standard segments**: `ui/` (the form, button, or menu item), `api/` (server actions, fetchers), `model/` (Zod schema, hooks), `config/` (feature flags if any).

**Rules**
- Features import entities and shared. They do **not** import each other.
- If two features need the same helper: if it's domain-bound, promote to the relevant entity; if domain-agnostic, to shared.

Not every button needs to be a feature. A button that just navigates (`<Link />`) doesn't. A button that performs an action (submit, delete, upvote) does.

## widgets/ — Composed UI blocks

A UI block that **composes multiple features and/or entities** and is **reused across two or more pages**. Create only when the reuse condition is met.

Examples: global header (logo + nav + user menu), project-grid (project cards + rank badges + empty state).

**Rules**
- Widgets import features, entities, shared. Not other widgets (same-layer isolation).
- If a widget is used on only one page, consider inlining it on that page until the second page needs it.

## core/ — App-wide bootstrap

FSD's `app` layer renamed to avoid collision with Next.js `app/`. Contains things that run **once at app start** and wrap the entire tree.

- `<ThemeProvider>`, `<QueryProvider>`, `<SessionProvider>`
- Analytics init (`core/config/analytics.ts`)
- Global error boundary

**Rules**
- No slices — subfolders are by purpose (`providers/`, `config/`).
- Imports shared only.
- If you're wrapping the app with it in layout.tsx, it probably belongs here.

## app/ — Next.js App Router

Route files only — `layout.tsx`, `page.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `globals.css`. A page file composes features, widgets, and entities. Keep page files thin:

```tsx
// app/projects/page.tsx
import { ProjectGrid } from "@widgets/project-grid"
import { SubmitProjectButton } from "@features/submit-project"
import { CohortFilter } from "@features/filter-by-cohort"

export default async function ProjectsPage() {
  return (
    <>
      <CohortFilter />
      <SubmitProjectButton />
      <ProjectGrid />
    </>
  )
}
```

Page-level integration tests live in `app/__tests__/` or next to their route (`app/<route>/page.test.tsx`).

## Decision flowchart

```
Is this a Next.js route file (page/layout/route/loading/error)?
  └─ YES → app/
  └─ NO  → does it wrap the whole tree with a provider?
            └─ YES → core/
            └─ NO  → does it know a business domain?
                      └─ NO → shared/
                      └─ YES → is it a user action (verb)?
                                └─ YES → features/
                                └─ NO  → is it a domain object (noun)?
                                          └─ YES → entities/
                                          └─ NO  → is it reused across pages?
                                                    └─ YES → widgets/
                                                    └─ NO  → inline it on the page for now
```
