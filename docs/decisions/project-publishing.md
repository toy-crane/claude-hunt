# Project Publishing

## Decisions

- A project is the product's primary content unit. It has a stable detail URL, an external project URL, a title, one-line tagline, optional longer description, one to five ordered images, and an optional GitHub repository URL.
- The first image is the primary image used by lists and social previews; the detail page exposes the complete ordered gallery and longer context.
- Any visitor may read a project. Only its owner may create changes to it or delete it.
- Deleting a project cascades its database-backed comments, replies, reactions, and recommendations. Storage image cleanup is attempted after a successful change but remains best-effort so an unavailable object store never blocks the user's edit or deletion.
- Keep the experience project-centric: there are no author profile pages or separate class sites.

## Boundaries

- The external project remains a first-class destination; the detail page adds context and discussion rather than replacing the submitted work.
- Project publishing does not grant an owner control over other users' comments.
- A failed storage cleanup may leave an unreachable orphaned object; it must not roll back an otherwise successful project edit or deletion.

## Why

The original low-friction format made sharing easy, while the detail page and ordered gallery provide enough context for meaningful discovery and discussion. Keeping ownership and cascades centered on a project makes the public lifecycle predictable without introducing broader author or class publishing systems.

## Reconsider when

- Projects need categories, versioned releases, teams of owners, or author portfolios.
- One to five images and the current text fields no longer let visitors understand the submitted work.
