# Project Publishing

## Decisions

- A project is the product's primary content unit. It has a stable detail URL, an external project URL, a title, one-line tagline, optional longer description, one to five ordered images, and an optional GitHub repository URL.
- The first image is the primary image used by lists and social previews; the detail page exposes the complete ordered gallery and longer context.
- Images come from the owner or, only when the owner provides none, from automatic capture. Submitting or saving an edit with zero images makes the system capture the project URL's first screen as the primary image, and the submission or save waits for that capture; if it fails, nothing is published or saved and the owner is told the URL could not be opened. After the change succeeds, the system appends up to four more automatically captured screens to the gallery in the background. An owner who uploads even one image gets no automatic capture.
- Any visitor may read a project. Only its owner may create changes to it or delete it.
- Deleting a project cascades its database-backed comments, replies, reactions, and recommendations. Storage image cleanup is attempted after a successful change but remains best-effort so an unavailable object store never blocks the user's edit or deletion.
- Keep the experience project-centric: there are no author profile pages or separate class sites.

## Boundaries

- The external project remains a first-class destination; the detail page adds context and discussion rather than replacing the submitted work.
- Project publishing does not grant an owner control over other users' comments.
- A failed storage cleanup may leave an unreachable orphaned object; it must not roll back an otherwise successful project edit or deletion.
- Automatically captured images belong to the project like uploaded ones: the owner may reorder or remove them, and background additions never replace images the owner has changed in the meantime.

## Why

The original low-friction format made sharing easy, while the detail page and ordered gallery provide enough context for meaningful discovery and discussion. Keeping ownership and cascades centered on a project makes the public lifecycle predictable without introducing broader author or class publishing systems.

Some owners, notably students on LG Electronics machines, cannot upload screenshots at all. Waiting a few seconds for the first-screen capture keeps the invariant that every public project has a primary image, so lists, the detail page, and social previews need no image-less state; only the slower highlight captures run after publication so submission stays low-friction.

## Reconsider when

- Projects need categories, versioned releases, teams of owners, or author portfolios.
- One to five images and the current text fields no longer let visitors understand the submitted work.
- First-screen capture regularly takes long enough that waiting at submission becomes the main source of submission friction.

## Still-rejected alternatives

- Publish immediately and fill the primary image later — allows image-less public projects and needs empty states on the board, detail page, and social previews; revisit only if first-screen capture can no longer finish within a short wait.
- Make submission wait for every automatic capture — adds one to two minutes of waiting; revisit if background capture becomes fast enough to finish within the first-screen wait.
- Stop background capture at submission — leaves fast submitters with only the first screen.
