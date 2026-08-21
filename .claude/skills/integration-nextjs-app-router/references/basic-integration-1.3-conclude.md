---
title: PostHog Setup - Conclusion
description: Review and fix any errors in the PostHog integration implementation
---

Use the PostHog MCP to create a new dashboard named "Analytics basics (wizard)" based on the events created here. Keep the `(wizard)` tag with that exact casing so anyone browsing PostHog can see the wizard created this dashboard, and so a quick search for `(wizard)` surfaces every wizard-created artifact in one go. Make sure to use the exact same event names as implemented in the code. Populate it with up to five insights, with special emphasis on things like conversion funnels, churn events, and other business critical insights.  

Search for a file called `.posthog-events.json` and read it for available events.

Do not spawn subagents.

Do not create a root setup report. Return the integration summary, event table,
and dashboard and insight links in the completion message. Durable project
context belongs in the repository's existing knowledge surfaces: use
`project-knowledge` only when the integration settles a reusable non-obvious
decision or exposes an evidence-backed unresolved defect.

Follow this completion format:

<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of your project. [Detailed summary of changes]

[table of events/descriptions/files]

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

[links]

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

Upon completion, remove .posthog-events.json.

## Status

Status to report in this phase:

- Configured dashboard: [insert PostHog dashboard URL]
- Reported integration summary and dashboard links in the completion message
