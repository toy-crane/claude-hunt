---
name: spec
description: Start spec-driven development — write a structured specification before writing code. Trigger with "/spec", "write a spec", "define requirements", etc.
---

# Spec

Write a structured specification by understanding what the user wants to build.

## Step 1: Surface Assumptions

Before writing any spec content, list what you're assuming:

```
ASSUMPTIONS I'M MAKING:
1. This is a web application (not native mobile)
2. Authentication uses session-based cookies (not JWT)
3. The database is PostgreSQL (based on existing Prisma schema)
4. We're targeting modern browsers only (no IE11)
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The spec's entire purpose is to surface misunderstandings *before* code gets written.

## Step 2: Ask Clarifying Questions

Ask about:
1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack preferences and constraints
4. Known boundaries (what to always do, ask first about, and never do)

## Step 3: Reframe as Success Criteria

Translate vague requirements into concrete, testable conditions:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED SUCCESS CRITERIA:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ Are these the right targets?
```

## Step 4: Write the Spec

Cover these six core areas:

1. **Objective** — What are we building and why? Who is the user? What does success look like?
2. **Commands** — Full executable commands (build, test, lint, dev)
3. **Project Structure** — Where source code, tests, and docs live
4. **Code Style** — One real code snippet showing the style beats three paragraphs describing it
5. **Testing Strategy** — Framework, test locations, coverage expectations, test levels
6. **Boundaries**
   - **Always do:** Run tests before commits, follow naming conventions, validate inputs
   - **Ask first:** Database schema changes, adding dependencies, changing CI config
   - **Never do:** Commit secrets, edit vendor directories, remove failing tests without approval

## Step 5: Verify Completeness

Before saving, confirm:

- [ ] The spec covers all six core areas
- [ ] The human has reviewed and approved the spec
- [ ] Success criteria are specific and testable
- [ ] Boundaries (Always / Ask First / Never) are defined

Save the spec as `SPEC.md` in the project root and confirm with the user before proceeding.
