---
name: compound
description: Document solved problems into knowledge/ directory to build compound team knowledge. Invoke after bug fixes, issue resolution, or feature implementation with "/compound".
argument-hint: <brief description of what was solved (optional)>
user-invocable: true
---

# Compound — Knowledge Accumulation

Document what you just solved so the next encounter takes 2 minutes instead of 30.

## Workflow

### Step 1: Gather Context

Determine what was solved:

- **If `$ARGUMENTS` is provided**: Use it as the primary description of the problem and solution.
- **If `$ARGUMENTS` is empty**: Auto-analyze recent work by running these commands in parallel:
  ```bash
  git log --oneline -10
  git diff HEAD~3..HEAD --stat
  git diff HEAD~3..HEAD
  ```

Then read the key changed files to fully understand the problem and how it was solved.

### Step 2: Analyze

Perform a single-pass analysis covering all five dimensions:

1. **Problem Analysis** — What was the problem? Identify the type (bug, performance, architecture, etc.), symptoms, and how it manifested.
2. **Solution Extraction** — What was the fix? Summarize the root cause and the key code changes that resolved it.
3. **Prevention Strategy** — How do we prevent recurrence? Identify patterns, checks, or tests that would catch this earlier.
4. **Category Classification** — Assign one of: `build-errors`, `test-failures`, `runtime-errors`, `performance-issues`, `database-issues`, `security-issues`, `ui-bugs`, `integration-issues`, `logic-errors`, `architecture`, `tooling`.
5. **Related Docs Check** — Search existing `knowledge/` directory for duplicates or related documents. If a closely related doc exists, consider updating it instead of creating a new one.

### Step 3: Write Document

Create a file at `knowledge/YYYY-MM-DD-<topic>.md` where `<topic>` is a concise kebab-case slug.

If the `knowledge/` directory does not exist, create it first.

Use this template:

```markdown
---
title: "<Problem Title>"
date: YYYY-MM-DD
category: <category>
tags: [<related-tech>, <module-name>]
severity: <low|medium|high|critical>
---

## Problem

[Describe the symptoms and how the problem manifested. Include reproduction conditions if applicable.]

## Root Cause

[Explain why this problem occurred — the underlying cause, not just the symptom.]

## Solution

[Describe how it was fixed. Include key code changes with brief code snippets where helpful.]

## Prevention

[List patterns, checks, or tests that would catch this earlier next time.]

## Related Files

[List the key files that were changed to fix this problem.]
```

### Step 4: Confirm

1. Present the generated document content to the user.
2. Ask if any changes are needed before finalizing.
3. If the user approves, confirm the file has been written.

## Constraints

- Do NOT create sub-agents. Perform all analysis inline as the orchestrator.
- Do NOT skip Step 4 (user confirmation). Always present the document before considering it done.
- Keep documents concise — aim for clarity over completeness. A good knowledge doc is one that can be scanned in under 60 seconds.
- Write document content in the same language the user is communicating in.
