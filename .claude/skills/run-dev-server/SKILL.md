---
name: run-dev-server
description: Start the Next.js dev server under a persistent Monitor so ready/error/request events stream into chat. Use when the user wants to run the dev server, watch dev logs, or start dev — trigger on phrases like "run dev server", "start dev", "watch dev", "dev with logs", "dev 켜줘", "개발 서버 띄워줘".
user-invocable: true
---

# Run Dev Server

Start `bun run dev` under a persistent Monitor. Each notable stdout line becomes a chat notification, so compile errors, runtime errors, and request status surface without context-switching to a terminal.

## Preconditions

- `package.json` defines a `dev` script (this template uses `next dev --turbopack`).
- No other Monitor is already streaming the dev server in this session — duplicate processes will fight for port 3000.

If a `run-dev-server` Monitor is already running, stop and tell the user; do not start a second one.

## Workflow

### Step 1: Start the Monitor

Call the `Monitor` tool with:

- `description`: `"next.js dev"`
- `persistent`: `true`
- `timeout_ms`: `3600000`
- `command`:

  ```bash
  bun run dev 2>&1 | grep -E --line-buffered 'Ready in|Local:|compiled|Error|error|warn|Failed|ECONN|EADDR|GET |POST |PUT |DELETE |PATCH '
  ```

The filter keeps:
- Ready/local URL signals (so the user sees when the server is up)
- Compile events and warnings
- Errors, failures, network bind errors
- HTTP method lines (status + path)

It drops everything else to control notification volume.

### Step 2: Report

Tell the user:

- Local URL: `http://localhost:3000`
- Monitor task ID (returned by the tool call)
- The Monitor dies on session end — re-run this skill to restart.
- Stop early with `TaskStop <task-id>`.

## Constraints

- Do not pipe raw `bun run dev` output through Monitor without `grep --line-buffered` — every stdout line becomes a chat message and burns context fast.
- Do not omit `2>&1` — Next.js writes some errors to stderr; without redirection, the filter misses them.
- Do not start a second Monitor for the same dev server in one session.
