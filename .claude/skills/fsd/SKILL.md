---
name: fsd
description: Feature-Sliced Design reference for Next.js apps. Auto-load when applying, extending, or making architectural decisions about FSD structure (where to put a new file, layer boundaries, slice public API, Next.js app/ router integration).
---

# Feature-Sliced Design for Next.js — Reference

FSD organizes front-end code **by business domain first, technical role second**. One feature lives in one folder. Cross-feature coupling is kept out of source by structure.

This skill is a workflow reference — no triggers, no scaffolding commands. Load the references below when you need to make an FSD decision.

## References

- `references/structure.md` — Standard folder layout for Next.js + FSD
- `references/layer-guide.md` — When to use each layer, with examples
- `references/boundaries.md` — Import rules, public API, slice isolation
- `references/nextjs-integration.md` — Next.js-specific adaptations (app/ router, server actions, route handlers)

## Core Rules (summary)

1. **Layers, bottom to top**: `shared → entities → features → widgets → core → app`. Higher layers import lower; never the reverse.
2. **Slice isolation**: On the same layer, slices cannot import each other (`features/A` ↛ `features/B`, `entities/X` ↛ `entities/Y`). Shared logic promotes up to a lower layer.
3. **Public API**: Each slice exposes its surface via `index.ts`. External code imports from `@features/<slice>`, never from `@features/<slice>/ui/...`. Slice-internal tests may use relative imports.
4. **Next.js adaptation**: `app/` is the Next.js router (not FSD's `app` layer). FSD's `app` is renamed to `core/`. FSD's `pages` layer is dropped — Next.js `app/*/page.tsx` absorbs it.

## Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@core/*": ["./core/*"],
      "@features/*": ["./features/*"],
      "@entities/*": ["./entities/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

(Add `@widgets/*` if/when the `widgets/` layer is used.)

## Workflow — Adding a Feature

1. **Determine the layer** (see `references/layer-guide.md`).
2. **Create the slice folder** and segments (`ui/`, `api/`, `model/` as needed).
3. **Write `index.ts`** that re-exports the public API only.
4. **Implement bottom-up**: `shared` deps first, then `entities`, then the new slice.
5. **Co-locate tests** alongside source (`login-form.tsx` + `login-form.test.tsx`). Use relative imports inside the slice; barrel imports only for cross-slice test mocks.
6. **Consume via the public API** from higher layers (`app/*/page.tsx`, `widgets/*/ui/*.tsx`, etc.).

## Workflow — Adding a Scenario to spec.yaml

See `.claude/skills/write-spec` (scenario-guide.md section 3, spec-example.yaml). IDs use `{L}-{SLICE}-{NNN}` with L ∈ {E, F, W, P, S, DB}.
