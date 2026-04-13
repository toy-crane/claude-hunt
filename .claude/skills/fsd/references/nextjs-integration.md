# Next.js Integration — FSD Adaptation Guide

FSD was designed framework-agnostic. Next.js's `app/` router partially overlaps with FSD's `app` layer, so we adapt.

## Two conventions that collide

| Convention | Uses `app/` for |
|------------|-----------------|
| Next.js App Router | Routing — every folder is a URL segment; `page.tsx`/`route.ts`/`layout.tsx` are reserved filenames |
| FSD (canonical) | A layer — providers, global setup, app entrypoint |

You cannot have both. Pick one.

## Adopted convention (this project)

- **Next.js `app/` wins** as the routing directory.
- **FSD `app` layer is renamed to `core/`** to contain providers, bootstrap, global setup.
- **FSD `pages` layer is dropped** — Next.js `app/*/page.tsx` absorbs it. Page files directly compose features/widgets/entities.

The alternative (keep FSD `app/` under `src/app/`, use Next.js `app/` as thin route shells) is viable but doubles the page files. For projects where page composition is simple, the dropped-pages approach is cleaner.

## File placement rules

### Stays in `app/`

- `app/**/page.tsx` — page composition
- `app/**/layout.tsx` — route-scoped layouts
- `app/**/route.ts` — Next.js route handlers (cannot move; Next.js requires them here)
- `app/**/loading.tsx`, `error.tsx`, `not-found.tsx` — Next.js special files
- `app/globals.css` — Tailwind base, CSS variables
- `app/__tests__/` — page-level integration tests (the `__tests__` folder name is ignored by Next.js routing)

### Moves to `features/<slice>/api/`

- **Server actions** (`'use server'`). Next.js supports them anywhere, so they belong to the feature that owns the action.

### Moves to `core/providers/`

- `<ThemeProvider>`, `<QueryProvider>`, `<SessionProvider>`, `<ErrorBoundary>` — anything wrapped in `app/layout.tsx`.

### Middleware

- `proxy.ts` (Next.js 16) or `middleware.ts` (older) stays at the repo root.
- Helper functions called by middleware live in `shared/api/<service>/proxy.ts`.

## Server Components vs Client Components

FSD doesn't prescribe this. Standard Next.js rule applies: `'use client'` at the top of a component file when it needs browser APIs or React state. Place the directive **in the leaf component**, not in the slice `index.ts`.

```tsx
// features/submit-project/ui/project-form-dialog.tsx
"use client"
export function ProjectFormDialog() { /* ... */ }
```

```tsx
// features/submit-project/api/actions.ts
"use server"
export async function submitProject(formData: FormData) { /* ... */ }
```

Both live in the same slice. Next.js RSC model handles the split; FSD doesn't care.

## Metadata and SEO

`export const metadata` / `generateMetadata` belong in `app/**/page.tsx`. If the metadata needs domain logic, create a helper in the relevant entity or feature and import it:

```tsx
// app/projects/[id]/page.tsx
import { getProjectMetadata } from "@entities/project"
export async function generateMetadata({ params }) {
  return getProjectMetadata(params.id)
}
```

## Data Fetching

- Fetches that belong to a specific route → `app/<route>/page.tsx` (server component).
- Fetches reused across slices → `entities/<domain>/api/` or `features/<slice>/api/`.
- Do **not** centralize all fetches in a `shared/api/` catch-all — that recreates the "one giant service file" anti-pattern FSD tries to prevent.

## Component libraries (e.g. shadcn)

- Install location: `shared/ui/` (the FSD home for the design system).
- Configure the component library's CLI accordingly. For shadcn, update `components.json`:
  ```json
  {
    "aliases": {
      "components": "@shared",
      "utils": "@shared/lib/utils",
      "ui": "@shared/ui",
      "lib": "@shared/lib",
      "hooks": "@shared/lib"
    }
  }
  ```
- Future `npx shadcn add <component>` will install into `shared/ui/`.

## Icons

Treat icon components like UI components — `shared/ui/icons/<name>.tsx`. Don't put them in a feature slice unless the icon is *genuinely* domain-specific (rare).

## CSS

- Global styles (`globals.css`) → `app/globals.css` (Next.js convention).
- Tailwind config stays at the repo root.
- Component-level styling uses classes + the project's `cn` util from `@shared/lib/utils`.

## tsconfig and tooling

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["./core/*"],
      "@features/*": ["./features/*"],
      "@entities/*": ["./entities/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

```ts
// vitest.config.ts (keep in sync with tsconfig)
resolve: {
  alias: {
    "@core": resolve(import.meta.dirname, "./core"),
    "@features": resolve(import.meta.dirname, "./features"),
    "@entities": resolve(import.meta.dirname, "./entities"),
    "@shared": resolve(import.meta.dirname, "./shared"),
  },
},
```

## Biome gotchas

- `noUndeclaredDependencies` misreads `@shared/*`-style aliases as scoped NPM packages. Disable it — `tsc` and the bundler already cover typos.
- `noBarrelFile` flags slice `index.ts`. Disable it — public API barrels are FSD's convention, not the anti-pattern the rule targets.
- shadcn components trip `a11y/useSemanticElements`, `noDoubleEquals`, `noArrayIndexKey`. Override these rules for `shared/ui/**` since shadcn source must not be modified.

## Common mistakes

- Putting a server action in `app/**/actions.ts` out of Next.js habit. Move it to `features/<slice>/api/actions.ts`.
- Creating `widgets/<X>/` when `<X>` is only used on one page. Inline on the page until a second consumer appears.
- Exporting too much from a slice `index.ts`. Export only the external-facing API.
- Reaching into `@features/<slice>/ui/...` from a consumer. Always go through the barrel.
