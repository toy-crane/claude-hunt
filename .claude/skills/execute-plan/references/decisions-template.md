# decisions.md Writing Guide

Record the Team Lead's decisions in `artifacts/<feature>/decisions.md`.

## Entry Format

```markdown
## <Title>

- Content: <What happened>
- Decision: <How it was decided>
- Rationale: <Why it was decided that way>
- Result: Pending
```

## Result Updates

As execution progresses, update `Pending` to one of the following status values:

| Status | Meaning |
|--------|---------|
| Success | The decision worked as intended |
| Partial | It worked but required additional fixes |
| Failure | A different approach was needed |

After the status value, describe the specific result in free-form text.

```markdown
- Result: Success — Reviewer pass on first Builder delegation
- Result: Partial — Feature works but required a second fix for shadcn pattern non-compliance
- Result: Failure — Same barrel import violation recurred in next feature
```

## Update Timing

- After Step 5 (evaluation loop) completion: Update results for Step 2-3 decisions
- At Step 7 (done): Update all remaining `Pending` results
