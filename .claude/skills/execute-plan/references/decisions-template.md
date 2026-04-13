# decisions.md Writing Guide

Record the Team Lead's judgment calls in `artifacts/<feature>/decisions.md`.

The primary purpose of this file is to give **future harness updates** enough context to improve the skill. Prefer clarity over strict form — capture the signal that matters.

## Entry Format

```markdown
## <Title>

**When**: <which Step / what situation triggered the decision>
**Decision**: <what was decided>
**Why**: <reasoning — cite spec path, prior cases, constraints>
**Harness Signal**: <if this judgment is likely to recur, what rule could be added to SKILL.md — or which part of the current rules was unclear. Write "N/A" if nothing generalizable>
**Result**: Pending → Success / Partial / Failure + specific observation

<Optional free notes: alternatives considered, trade-offs, follow-ups>
```

### Example

```markdown
## Ordered auth-login before submit-project

**When**: Step 3, Task ordering
**Decision**: Execute `auth-login` first, then `submit-project`. Both share the `profiles` entity schema.
**Why**: `submit-project` imports `profiles` types that `auth-login` introduces. Reversed order would force a throwaway stub.
**Harness Signal**: plan.md does not currently mark entity-level dependencies between Tasks. Consider adding a "Depends on" field per Task so ordering does not require manual dependency analysis.
**Result**: Pending
```

## When to Record

Log a decision whenever a judgment call is made. Typical triggers:

| Event | Step |
|---|---|
| Reviewer selection (which agents, which omitted) | Step 2 |
| Task execution order (dependencies) | Step 3 |
| Spec ambiguity — chose one interpretation | Step 4 |
| Task scope changed (added / removed / merged) | Step 4 |
| Build or test failure — recovery path | Step 4 |
| Reviewer feedback judgment (accept / reject / partial) | Step 5 |
| `ui-quality-reviewer` Warning accepted | Step 5 |
| User escalation | any Step |

Do not log self-evident decisions (e.g. "followed plan.md exactly, no alternatives considered").

## Result Updates

Start each entry with `Result: Pending`. Update as execution progresses:

| Status | Meaning |
|--------|---------|
| Success | The decision worked as intended |
| Partial | It worked but required additional fixes |
| Failure | A different approach was needed |

After the status, describe the specific outcome in free-form text.

```markdown
- Result: Success — Reviewer passed on first attempt
- Result: Partial — Feature works but required a second pass for shadcn token compliance
- Result: Failure — Reversed ordering introduced a circular import; switched back mid-Task
```

### Update Timing

- **During Step 4**: Update Pending → Partial / Failure early when a decision's impact Task completes
- **After Step 5 (evaluation loop)**: Finalize Step 2 (Reviewer selection) and Step 3 (Task order) results
- **At Step 6 (done)**: Resolve every remaining Pending entry and summarize all Harness Signal notes in the final report
