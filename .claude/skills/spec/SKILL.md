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

Read `references/spec-template.md` and fill in each section based on the information gathered in Steps 1–3.

Tips for filling it well:

- **Objective** — What are we building and why? Who is the user? What does success look like?
- **Commands** — Full executable commands (build, test, lint, dev)
- **Project Structure** — Where source code, tests, and docs live
- **Code Style** — One real code snippet showing the style beats three paragraphs describing it
- **Testing Strategy** — Framework, test locations, coverage expectations, test levels
- **Boundaries** — Always do / Ask first / Never do

## Step 5: Verify Completeness

Before saving, confirm:

- [ ] The spec covers all six core areas
- [ ] The human has reviewed and approved the spec
- [ ] Success criteria are specific and testable
- [ ] Boundaries (Always / Ask First / Never) are defined

Save the spec as `artifacts/[feature-name]/spec.md` and confirm with the user before proceeding.
