# Class Catalog

## Decisions

- Use `클래스` for the user-visible grouping. `기수` means only the numbered round inside an LG Electronics class label; it is not a synonym for class.
- Each class row has a stable `name` used by code, tests, seed data, and server lookups, plus a user-visible `label`. Behavior matches the stable name, never the label.
- Display order is Inflearn first, numbered classes newest first by `created_at`, and the operator-only TOYCRANE class last. Equal timestamps use name only as a deterministic tie-breaker.
- Keep classes with zero projects visible so a newly opened class does not appear only after its first submission.
- TOYCRANE is excluded only from user selection. Its projects, label, count, and filter remain visible.
- When inserting several classes in one transaction, set `created_at` explicitly because PostgreSQL `now()` gives them the same transaction timestamp.

## Why

The catalog contains both numbered classes and non-numbered tracks, so parsing names or reversing lexical order cannot express the intended order. Reusing `created_at` keeps ordinary single-class additions automatic, while explicit pins express the two rules that are not dates. Stable names prevent copy changes from silently changing behavior.

## Reconsider when

- Inflearn gains multiple numbered classes or another non-numbered track needs its own placement rule.
- Class rows are routinely inserted in batches.
- `created_at` must return to being a strictly factual audit timestamp rather than also serving display order.

## Still-rejected alternatives

- Dedicated `display_order` column — adds manual maintenance and silently misplaces a class when the value is omitted; reconsider if catalog size or ordering rules outgrow the current pins.
- Parsing sequence numbers from `name` — fails for non-numbered classes and couples display behavior to identifiers.
- Sorting by project activity — sends a new class with no projects to the bottom, opposite the discovery goal.
