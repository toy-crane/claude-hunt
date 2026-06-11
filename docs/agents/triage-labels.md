# Triage Labels

Label scheme for the Linear **Claude Hunt** team. The `triage` and `dispatch-issue` skills read this document as their single source of truth.

## Type labels (one per issue)

Same vocabulary as the commit convention. Dispatch derives its commit-message type from this label.

| Label | Meaning |
| --- | --- |
| `bug` | Something is broken or behaves incorrectly |
| `feat` | New user-facing capability |
| `refactor` | Internal restructure without behavior change |
| `chore` | Config, deps, tooling, housekeeping |
| `docs` | Documentation, rules, CLAUDE.md |

## Triage state labels (one per issue)

| Label | Meaning |
| --- | --- |
| `needs-triage` | Awaiting classification. Issues with no triage-state label are treated the same |
| `needs-info` | One line from the author would make it `ai-ready`. Waiting on a human reply |
| `ai-ready` | All 3 axes pass. Dispatch may pick it up immediately |
| `needs-human` | The decision or impact axis fails. Needs human judgment or implementation |
| `wontfix` | Will not be addressed. The issue is also moved to Canceled |

## The 3-axis gate

Criteria for `ai-ready`. All three must pass.

| Axis | Question | Pass example | Fail example |
| --- | --- | --- | --- |
| Decision | Is what to build already decided? | "Change the button to `#3E63DD`" | "Make the button nicer" (product/design judgment remains) |
| Verification | Can the result be checked automatically or by observation? | A test exists or can be written; the behavior is visible | "It should feel better" |
| Impact | Is the blast radius narrow and predictable? | One file, one component, one slice | Spans auth, payments, DB schema, or multiple systems |

Impact-axis fail signals specific to this repo:

- DB schema changes or migrations (`supabase/schemas/`, `supabase/migrations/`, policy SQL)
- Auth / RLS / permission policy changes
- New external dependency
- Deploy, CI, or secrets changes
- Cross-slice rewrites (FSD slice isolation) or changes that would be hard to revert

Verdict rules:

- All three pass → `ai-ready`
- One axis would pass with a single line from the author → `needs-info`
- The decision or impact axis fails inherently (judgment remains, or the scope is wide) → `needs-human`

## Execution labels

| Label | Meaning |
| --- | --- |
| `dispatch-failed` | A dispatch attempt failed. Needs human follow-up. Excluded from the dispatch queue |

## State transitions

```
intake (capture/auto) → Backlog/Todo + (no label | needs-triage)
triage                → assigns Type + triage state label. wontfix also sets state=Canceled
dispatch              → state=In Progress on pickup (duplicate-run guard)
                      → state=In Review + PR link comment after the PR is created
                      → on failure: dispatch-failed label + reason comment + back to state=Todo
human merge           → the Linear GitHub integration moves the issue to Done
```

After the author supplies the missing line on a `needs-info` issue, a human flips the label back to `needs-triage`. The skills do not track the round trip.
