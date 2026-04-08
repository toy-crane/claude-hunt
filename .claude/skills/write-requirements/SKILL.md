---
name: write-requirements
description: Organize the user's idea into a requirements document through an interview. Walk through the entire user flow together, organizing the core idea, design principles, and key tools. Trigger with "/write-requirements", "requirements", "organize requirements", "organize features", etc.
argument-hint: "feature description (free format)"
---

# Organize Requirements

When defining the initial MVP feature, walk through the entire flow with the user and organize the requirements. The deliverable is `artifacts/<feature>/requirements.md`.

The purpose of this skill is to roughly structure the idea in the user's mind. It does not need to be perfect or airtight -- that is the role of `/write-spec`.

## Step 1: Listen to the Idea

If `$ARGUMENTS` exists, use it as the starting point. If not, start with AskUserQuestion: "What would you like to build?"

## Step 2: Walk Through the Flow Together

Follow the user flow from beginning to end together. This is the core of the interview.

Start with "When the user first encounters this feature, what is the first action they take?" and naturally continue at each step with "What happens next?"

Take note of things that naturally emerge while walking through the flow:

- When the user says "~ must not", "without ~" -> Design principle
- When the user mentions a specific library or API -> Key tool

Do not force it. Principles or tools that do not naturally come up from the flow explanation can be left empty. `/write-spec` can fill them in later.

End the interview when the flow reaches its conclusion.

### Question Rules

- Use AskUserQuestion
- Ask one at a time
- Asking about the next step in the flow is the default -- do not ask section by section

## Step 3: Organize the Document

Read `references/requirements-template.md` and organize the content from the interview into 4 sections.

### Writing Criteria per Section

- **Core Idea**: One sentence, in the form of "what + why"
- **User Flow**: Numbered steps, happy path only
- **Design Principles**: In the form of "Principle -- Explanation", only what emerged from the flow
- **Key Tools**: Exclude stacks already in `package.json`, only record newly introduced ones. If none, leave the section empty

### Saving

- Extract the feature name from the conversation (English kebab-case). If ambiguous, confirm with the user
- Save path: `artifacts/<feature>/requirements.md`

## Step 4: Confirm and Guide

Show the completed document. If there are revision requests, incorporate them.

After completion, guide to the next step with `/write-spec <feature>`.
