<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into claude-hunt. Here is a summary of all changes made:

**Initialization**: PostHog is initialized in `instrumentation-client.ts` using the Next.js 15.3+ `instrumentation-client` pattern (no provider needed). Events are routed through a reverse proxy at `/ingest` to bypass ad-blockers — rewrites were added to `next.config.mjs`.

**Server-side client**: A shared PostHog Node client was created at `shared/api/posthog/server.ts` for future server-side use.

**User identification**: On onboarding completion, `posthog.identify()` is called with the user's Supabase UUID and profile properties (`display_name`, `cohort_id`). On account deletion, `posthog.reset()` clears the session.

**11 events** were instrumented across 10 client components:

| Event | Description | File |
|-------|-------------|------|
| `project_submitted` | User successfully submits a new project | `features/submit-project/ui/submit-form.tsx` |
| `project_edited` | User saves edits to an existing project | `features/edit-project/ui/edit-form.tsx` |
| `project_deleted` | User confirms deletion of their project | `features/delete-project/ui/delete-button.tsx` |
| `vote_toggled` | Authenticated user adds or removes a vote | `features/toggle-vote/ui/vote-button.tsx` |
| `comment_created` | User posts a comment or reply | `features/create-comment/ui/comment-form.tsx` |
| `reaction_toggled` | User adds or removes an emoji reaction on a comment | `features/toggle-reaction/ui/reaction-row.tsx` |
| `onboarding_completed` | New user completes onboarding (sets nickname + class) | `features/onboarding/ui/onboarding-form.tsx` |
| `account_withdrawn` | User confirms account deletion | `features/withdraw-user/ui/withdraw-dialog.tsx` |
| `display_name_updated` | User updates their display name in settings | `features/settings/ui/settings-form.tsx` |
| `login_initiated` | User starts a login attempt via OAuth or magic link | `features/auth-login/ui/login-form.tsx` |

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior, based on the events just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/463764/dashboard/1692792)
- **Project submissions over time**: [x6yLKWnN](https://us.posthog.com/project/463764/insights/x6yLKWnN) — daily count of new project submissions
- **Engagement actions over time**: [tVUlO4od](https://us.posthog.com/project/463764/insights/tVUlO4od) — votes, comments, and reactions as a combined trend
- **New user activations**: [w9ZYn8jN](https://us.posthog.com/project/463764/insights/w9ZYn8jN) — unique users completing onboarding vs. initiating login
- **Project lifecycle**: [ARzURqZB](https://us.posthog.com/project/463764/insights/ARzURqZB) — submitted vs. edited vs. deleted projects per day
- **Account withdrawals**: [gbmF9L0f](https://us.posthog.com/project/463764/insights/gbmF9L0f) — weekly churn signal (account deletions)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
