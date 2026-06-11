---
name: agent-loop
description: claude-hunt automation loop. Applies human feedback from the last digest threads, runs Linear triage and dispatch, then reports the results to #agent-hunt as a single digest. Matches "run the loop", "agent loop", "hunt loop", "루프 돌려", "트리아지하고 디스패치하고 보고해", and scheduled invocations.
user-invocable: true
---

# agent-loop

An orchestrator. It does no classification or code work itself — it calls the existing skills, gathers their results, and reports to Slack. One invocation = one cycle.

## Single sources

- Triage classification and labels → `triage` skill, `docs/agents/triage-labels.md`
- Issue work and PRs → `dispatch-issue` skill
- Linear operations → `docs/agents/issue-tracker.md`

## Preconditions

- `slack.sh` in this directory reads `SLACK_BOT_TOKEN` from the nearest `.env.local` going up the tree (worktrees get a copy via the worktree-create hook).
- `gh` CLI is logged in; the bot is a member of #agent-hunt.

## Slack

Posting, reading, and reacting all go through `slack.sh` (bash + curl + jq) in this directory. The bot `Maestro` (user_id `U0BA0TVGNEQ`) posts to #agent-hunt under the display name "hunt loop" (avatar = the app icon). The token is `SLACK_BOT_TOKEN` in the repo-root `.env.local` (gitignored — never commit it).

```
.claude/skills/agent-loop/slack.sh post    --channel hunt --text <message>                 # → ts
.claude/skills/agent-loop/slack.sh reply   --channel hunt --thread <ts> --text <message>   # → ts
.claude/skills/agent-loop/slack.sh react   --channel hunt --ts <ts> --emoji white_check_mark
.claude/skills/agent-loop/slack.sh replies --channel hunt --thread <ts>                    # → message JSON
.claude/skills/agent-loop/slack.sh history --channel hunt [--limit 30]                     # → message JSON
```

`post` and `reply` print the message ts on one line. `replies`/`history` JSON elements look like `{ts, user, bot, text, reactions:[{name, users}]}` (`history` also carries `thread_ts` and `reply_count`).

**Authority**: only reactions and replies from 한울 (`U0ASVV6J23X`) count as commands. Read everyone else's, act on no one else's.

**Triggers** (in threads):

| Signal | Meaning |
|---|---|
| 🚀 `rocket` | Force-dispatch this issue. Even if needs-human, raise it to `ai-ready` and work it |
| 👎 `-1` | wontfix (state Canceled) |
| Free-form reply | Any other instruction. Echo your interpretation back into the thread, then act. If ambiguous, do not act — reply asking what is unclear |
| ✅ `white_check_mark` | Loop-only. Marks an item as handled (humans never use it) |

Items or replies already carrying the bot's (`U0BA0TVGNEQ`) ✅ are done — the next run must not pick them up again.

## Workflow

### STEP 1. Apply thread feedback

Digest 한울's unhandled instructions from previous digest threads **before** any new work.

1. Read recent messages with `slack.sh history --channel hunt` and find bot digests (header `🤖 hunt loop`).
2. Read each digest's thread with `slack.sh replies --channel hunt --thread <digest-ts>`.
3. Consider **only 한울's (`U0ASVV6J23X`)** reactions and replies. Ignore everyone else's.
4. **Unhandled** = no bot ✅ on the item.
   - 🚀 on a needs-human item → force-dispatch: raise the issue to `ai-ready` via the `triage` skill's quick state change, then run `dispatch-issue` in single mode.
   - 👎 → `wontfix` via the `triage` skill (state Canceled).
   - Free-form reply → interpret the instruction. **Echo the interpretation into the thread as one line** (`slack.sh reply`), then execute by delegating to the right skill. If ambiguous, do not execute — leave a reply asking the one thing that is unclear.
5. Add ✅ to every handled item and reply (`slack.sh react ... --emoji white_check_mark`) so the next run skips them.

Keep what happened here for the "human instructions applied" line in STEP 4.

### STEP 2. Triage

Run the `triage` skill over the whole queue (no argument). Keep the summary (counts per bucket) for STEP 4.

### STEP 3. Dispatch

Run the `dispatch-issue` skill in queue mode (no argument). It works `ai-ready` issues one independent agent per issue, sequentially, no cap (whole queue). Keep each result (PR URL or failure reason) for STEP 4.

Issues force-dispatched in STEP 1 are already In Progress/In Review, so the queue does not pick them up again.

### STEP 4. Post the digest

Assemble the STEP 1–3 results into one digest in the format below.

1. Post the body with `slack.sh post --channel hunt --text <body>` and capture the returned `ts`.
2. Post each needs-human item and each dispatch failure as its **own thread message** with `slack.sh reply --channel hunt --thread <ts> --text <item>` — one item = one message, so each can receive its own 🚀/👎/reply.
3. If there was nothing at all (empty queue, no new feedback), post a single line instead: `🤖 hunt loop · <time> · all clear (queue empty)`.

**Body** (summary only — receives no reactions)
```
🤖 hunt loop · <date time> run

🚀 human instructions applied (since last run, only if any)
   ✅ CLA-309 (split into 3 modules) → PR #131

📋 triage N issues: ai-ready a · needs-human b · needs-info c · wontfix d

🚀 dispatch N issues: ✅ CLA-312 #128 · ✅ CLA-315 #129 · ❌ CLA-318 build failed 🧵

⚠️ needs human: N issues. Reply with 🚀·👎·comments on the thread items below
```

**Thread** (one message per item — receives 🚀/👎/replies)
```
⚠️ CLA-309 new module structure: how to split needs judgment
❌ CLA-318 dispatch failed: build stage <one-line reason>
```

### STEP 5. Finish

Print the digest's message link or ts on one line and stop.

## Failure handling

If the loop itself is blocked (Linear query fails, token error, …), do not go silent. Post `slack.sh post --channel hunt --text "⚠️ hunt loop failure: <one-line reason>"` and stop. If even Slack is unreachable, leave the reason on stdout.

## Out of scope

- **Humans merge.** Dispatch ends at PR creation.
- The internal rules of triage and dispatch belong to those skills and their single sources. The loop calls them, reports their results, and routes human instructions — nothing more.
