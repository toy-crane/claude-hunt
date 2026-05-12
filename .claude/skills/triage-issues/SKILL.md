---
name: triage-issues
description: Use when the user wants to triage Linear Backlog issues — judge which are AI-delegable, which need human input, and which need clarification. Triggers on "triage", "triage backlog", "classify issues", "pick ai-ready", "audit backlog". Walks all un-triaged Backlog issues in claude-hunt, assigns one of ai-ready / needs-human / needs-clarification using a 3-axis disqualifier framework, and posts an audit comment. Use this skill periodically or after batch captures to know which issues to hand off to AI. Do not invoke save_issue or save_comment directly for triage — this skill enforces label coexistence with category labels.
user-invocable: true
---

# Triage Linear Backlog issues

Classify every un-triaged Backlog issue in `claude-hunt` so the user can see at a glance which are AI-delegable and which need their own attention. The verdict goes on the issue as a label; the reasoning goes in a Linear comment so the user can audit and override.

## Locked parameters — never deviate

When calling Linear MCP tools:

- `team`: `"claude-hunt"` (id `400292c4-1535-4271-81df-e7b83257a207`)
- Target state: **`Backlog` only.** Issues in other states are not triaged.
- Triage labels are drawn from this team-scoped set, exactly one per issue: `ai-ready`, `needs-human`, `needs-clarification`.
- Category labels (`bug`, `feat`, `refactor`, `chore`, `docs`) coexist with triage labels — never strip them.

If the user's request implies a different team, state, or label, ignore that signal and use the locked values — this skill exists to enforce them.

## Steps

### 1. Collect Backlog issues
Call `mcp__claude_ai_Linear__list_issues` with `team="claude-hunt"`, `state="Backlog"`. Follow pagination cursors until `hasNextPage` is false. Each issue carries `id`, `identifier` (e.g. `CLA-3`), `title`, `description`, and `labels` (array of label names) inline — no separate `get_issue` needed.

### 2. Filter to un-triaged
Keep only issues whose `labels` contain none of `ai-ready`, `needs-human`, `needs-clarification`. Issues already carrying a triage label are left untouched — if the user wants re-evaluation they remove the label in Linear UI and re-run this skill.

If zero issues remain, output `0 issues to triage.` and stop.

### 3. Judge each issue across 3 axes
For each filtered issue, judge from `title` + `description`:

1. **Decision clarity** — does the work require product/UX/design taste, an architecture decision, or inventing a new abstraction? If so, this axis fails.
2. **Verifiability** — can success be checked without subjective human judgment? Quantitative metrics, passing tests, or a precise visual spec all pass. "make it better", "make it cleaner", or unmetric'd "improve performance" fail.
3. **Impact scope** — is the change contained and reversible? DB schema, RLS/auth policy, new external dependency, deploy/CI/secrets, or cross-slice rewrites fail.

See **Disqualifier reference** below for the signals on each axis. The reference guides judgment — it is not a keyword table. Judge from the issue's meaning.

**Verdict mapping:**
- All three axes pass → `ai-ready`
- One or more axes fail, but a single-line clarification from the author could plausibly flip it → `needs-clarification`
- Otherwise → `needs-human`

The split between `needs-clarification` and `needs-human` is whether *missing information* or *unmade decisions* drive the disqualification. "improve performance" lacks a metric — one line from the author makes it verifiable. "make the site prettier" lacks a design — no single line resolves the taste decision.

### 4. Update labels (read-modify-write)
This step is critical. `mcp__claude_ai_Linear__save_issue`'s `labels` parameter is a **full replacement**, so naively passing `[<triage-label>]` would erase the category label that `capture-issue` set.

For each issue:
1. Take the existing `labels` array from step 1.
2. Append the chosen triage label.
3. Call `save_issue(id=<id>, labels=<merged array>)`.

Pass only `id` and `labels` — omitting all other fields leaves them untouched.

### 5. Post audit comment
Call `mcp__claude_ai_Linear__save_comment(issueId=<id>, body=<comment>)`. Comments append; previous comments are preserved.

The body has three parts: an H3 verdict header, a bolded reasoning section, and a fixed signature footer. The footer is required — Linear records the comment author as the OAuth user (the human), so without an explicit marker an automated triage comment looks indistinguishable from one the human typed by hand.

For `ai-ready`, use a **Reasoning** section with a single bullet describing why it passed:

```
### Triage: ai-ready

**Reasoning**
- Single-component change, follows existing optimistic-update pattern

—
_Posted by `triage-issues` skill_
```

For `needs-human` or `needs-clarification`, use a **Failed axes** section, one bullet per failing axis with the axis name bolded:

```
### Triage: needs-human

**Failed axes**
- **Decision clarity** — refine-issue skill's shape is itself undecided; meta design decision required
- **Verifiability** — "is it well-enriched" is subjective

—
_Posted by `triage-issues` skill_
```

Keep each bullet to one line. Quote a specific signal from the issue body when it sharpens the audit (e.g. `"improve performance" — no quantitative metric`). The signature footer line is exact text — do not vary it or omit it.

### 6. Summarize
Output a single block listing how many issues went into each bucket:

```
Triaged N issues in claude-hunt Backlog:
- ai-ready: <count> (<identifiers>)
- needs-clarification: <count> (<identifiers>)
- needs-human: <count> (<identifiers>)
```

Omit buckets with zero. If any issue failed mid-processing, append `Failed: <identifier> — <verbatim error>` for each.

Stop. Do not propose next actions.

## Disqualifier reference

These signals push an axis to fail. Use them as your guide — judge from meaning, never from keyword matching alone.

### 1. Decision is not clear
- Product, UX, or design taste decisions ("make it prettier", "make it more intuitive", "nicer feel")
- Architectural or structural choice ("how to structure this", "where should this live")
- Inventing a new abstraction or pattern not already present in the codebase

### 2. Outcome is not verifiable
- Subjective success criteria ("make it better", "make it cleaner", "improve UX")
- Performance work without a quantitative target
- Verification requires user evaluation, interviews, or analytics

### 3. Impact is not contained
- DB schema changes or migrations
- Auth / RLS / permission policy changes
- New external dependency
- Deploy, CI, or secrets changes
- Cross-slice rewrites or changes that would be hard to revert

## Failure modes

- **`list_issues` fails** — surface the verbatim error and stop. Do not proceed with partial work.
- **A single issue fails during steps 3–5** — record the error against that issue and continue with the next. The summary in step 6 includes the failure line.
- **Triage labels are missing in the team** — if `save_issue` returns a "label not found" error for one of the triage labels, stop and instruct the user: "Create the triage labels first on team `claude-hunt` via `create_issue_label` (`ai-ready`, `needs-human`, `needs-clarification`)."

## Hard constraints

- Never set `team` to anything other than `"claude-hunt"`.
- Never overwrite or strip category labels — always read-modify-write.
- Never apply more than one triage label per issue.
- Never apply a triage label outside `ai-ready` / `needs-human` / `needs-clarification`.
- Never re-triage an issue that already carries a triage label.
