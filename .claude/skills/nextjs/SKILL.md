---
name: nextjs
description: Guides Next.js workflow — image optimization, `next.config` patterns, middleware, route handlers, server actions, metadata, streaming, and local development quirks. Use whenever working on `next.config.mjs`, `<Image>`, `<Link>`, `app/` layouts, server components vs client components, or diagnosing Next.js-specific build/runtime errors (unconfigured host, hydration mismatch, serialization errors).
---

# Next.js Workflow

Covers recurring Next.js problems and the decisions behind them. Complements the broader `next-best-practices` skill, which focuses on architectural patterns — this skill focuses on concrete problems engineers hit while shipping.

## Core Principles

- **Version-check first**: Next.js behavior changes between minor versions — especially around image optimization, caching, and the App Router. Verify against the [current docs](https://nextjs.org/docs) before adding non-obvious config. Quote the version you verified against in PR descriptions when the behavior is version-sensitive.
- **Config runs at build time**: `next.config.mjs` evaluates once during `next build`. Values read from `process.env` are baked into the built server — missing envs at build time surface as runtime `undefined`, not as errors. Validate required envs with explicit throws in the config file.
- **Server/client boundary is load-bearing**: `"use client"` is a serialization boundary, not just a hint. Props crossing it must be serializable. Non-serializable values (functions, class instances, Maps) need to stay on one side.
- **Fail loudly over fallback silently**: When config or env is wrong, throw — don't default to an insecure or incorrect value. A broken build is cheaper than a broken deploy.

## Workflows

| Task | Guide |
|------|-------|
| Render `next/image` with a remote source (including `localhost` / private IPs in dev) | [local-images.md](references/local-images.md) |

## Common Pitfalls

- **"Invalid src prop" / "hostname is not configured"** — `images.remotePatterns` requires exact matches on protocol, hostname, port, and pathname. `localhost` ≠ `127.0.0.1`.
- **"Objects are not valid as a React child"** when rendering `<Image>` in tests — usually means the `next/image` import was removed (linter / formatter) and JSX resolves to `window.Image` (DOM constructor). Verify the import is present.
- **Image optimization silently fails against private IPs** — Next.js 16+ blocks local-IP sources by default (SSRF guard). See `local-images.md`.
- **Env missing at build time, not runtime** — `NEXT_PUBLIC_*` vars are inlined at build. If a Vercel preview is missing one, the build succeeds but the client ships `undefined`.
- **Hydration mismatch from `Date.now()` / `Math.random()` in client components** — any value that differs between server and first-client-render triggers it. Compute on the server (RSC) or in `useEffect`, not in the render body.

## Common Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build — runs `next.config.mjs` once, catches env/config errors |
| `bun run start` | Serve the production build (exercises the image optimizer and static caching) |
| `bun run test:unit` | Vitest component + RSC tests |
