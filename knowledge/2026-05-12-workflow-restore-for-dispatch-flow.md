# Workflow restore for dispatch-issue flow

## Date
2026-05-12

## Context

The previous decision (see [`2026-04-17-ship-skill-replaces-github-actions.md`](./2026-04-17-ship-skill-replaces-github-actions.md)) moved the deploy pipeline from GitHub Actions into the local `/ship` skill. The driving reason was **silent migration failure** in solo workflow: a failed `supabase db push` correctly gated off the Vercel deploy, but the developer never came back to the Actions tab to check, and the merge *appeared* successful for hours.

The `dispatch-issue` skill, introduced 2026-05-12, changes the working mode:

| | Previous (`/ship` era) | Now (dispatch-issue era) |
|---|---|---|
| PR author | Self | AI dispatch agent |
| Reviewer role | — (same as author) | Self |
| Merge frequency | Lower (own pace) | Higher (queued `ai-ready` issues) |
| Cognitive load of remembering `/ship` | Low (top of mind during own work) | High (already context-switched after merge) |

The trade-off has reversed: **"forgotten `/ship` after merge"** is now a more frequent failure mode than "silent workflow failure" — because as a reviewer the user mentally moves on the moment merge is clicked.

## Decision

Restore the previous `production.yml` workflow **verbatim** (3 jobs: test → migrate → deploy, sequential with `needs:`), and keep `/ship` as an emergency override path.

### Mitigating the original silent-failure problem

The 2026-04-17 root cause was async failure visibility, not pipeline structure. Mitigations:

1. **GitHub Actions failure email** — enabled by default; verify in [GitHub Notifications settings](https://github.com/settings/notifications) that "Actions" notifications are on and "Send notifications for failed workflows only" is checked.
2. **Repository watch** — both author and reviewer of a merged PR receive notifications when their commits' workflows fail.
3. **Optional Slack / Linear forwarding** — if email is noisy, add an `on: failure` step that posts to a notification channel. Not in scope for this restoration.

These mitigations are layered, not perfect. The trade-off is acceptable because dispatch-issue raises merge volume enough to flip the relative risk.

## Files

| Path | Status | Purpose |
|---|---|---|
| `.github/workflows/production.yml` | restored verbatim from `6cbf9b8^` | main push → test → migrate → deploy |
| `vercel.json` | unchanged | `git.deploymentEnabled.main: false` keeps Vercel out of the loop; workflow's deploy hook is the only production trigger |
| `.claude/skills/ship/SKILL.md` | unchanged | manual override for hotfixes / emergencies |

### Not restored

- `ci.yml` — `bun run check` + `bun run test:unit` already run in lefthook `pre-push`. Redundant in CI.
- `claude.yml`, `claude-code-review.yml` — solo workflow, no collaboration use.

## Required follow-up

GitHub Secrets must be set in repo Settings → Secrets and variables → Actions:

| Secret | Source |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase dashboard → Account → Access Tokens |
| `PRODUCTION_PROJECT_ID` | Supabase project ref (e.g. `sphsvgudpwjwfurkulmr`) |
| `PRODUCTION_DB_PASSWORD` | Supabase project → Database settings |
| `VERCEL_DEPLOY_HOOK` | Vercel project → Settings → Git → Deploy Hooks |

The existing deploy hook `i2jZB3BNYg` named "GitHub Actions Production" suggests at least `VERCEL_DEPLOY_HOOK` may still exist — verify in GitHub Settings before adding.

## Rollback

If the workflow proves unreliable again:

1. `git revert` this restoration commit
2. Continue using `/ship` exclusively
3. Update knowledge doc with the new outcome

## Related Decisions

- [`2026-04-08-production-deploy-workflow.md`](./2026-04-08-production-deploy-workflow.md) — original workflow rationale
- [`2026-04-17-ship-skill-replaces-github-actions.md`](./2026-04-17-ship-skill-replaces-github-actions.md) — supersession by `/ship`
