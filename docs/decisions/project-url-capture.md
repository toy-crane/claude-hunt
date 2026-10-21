# Project URL Capture

## Decisions

- Any time the system opens a project's external URL in a browser, the browser runs inside an isolated Vercel Sandbox microVM, never inside the app's own server functions.
- The first-screen capture is deterministic and uses no model. Choosing and reaching highlight screens beyond the first screen is done by a Claude Haiku 5.5 browser agent.

## Boundaries

- The isolation rule covers rendering or interacting with the external site. Fetching metadata the app already stores (title, URL text) needs no browser and is not covered.
- The agent may navigate, click, scroll, and type short harmless sample input on the project's own host; it never signs up, signs in, pays, deletes, sends messages, or leaves the project's host.

## Why

Any signed-in user can submit any URL, and the app's functions hold secrets such as the Supabase secret key and the Anthropic key. Running the external page in a separate microVM keeps a hostile page away from those secrets for roughly 1–2 KRW more per run than running Chromium in the function. Highlight screens are usually reached only by interacting with the app (playing, searching, calculating), which fixed capture rules cannot do; a 10-project evaluation showed Haiku 5.5 reaching such screens at well under 10 KRW per run.

## Reconsider when

- Sandbox start-up or cost makes the first-screen wait or the monthly bill material.
- A hosting option offers equivalent isolation inside the app's own runtime.
- Haiku-tier agents stop reaching interaction screens that owners would choose, or a cheaper model does as well.

## Still-rejected alternatives

- Headless Chromium inside the Vercel function — exposes the app's secrets to arbitrary pages; revisit only with equivalent process isolation.
- Deterministic multi-capture only (first screen, scroll sections, internal links) — cannot reach screens that need interaction; revisit if projects become mostly static pages.
- Deterministic capture plus model ranking — ranks better but still cannot reach screens that need interaction.

## Evidence worth preserving

- October 2026, 10 random public LG Electronics class projects with Haiku 5.5: 5 reached post-interaction highlights, 3 were blocked by the app itself (2 login walls, 1 user-supplied API key), 2 produced empty search results; total $0.055, average 63 seconds.
- In Vercel Sandbox (icn1, 1 vCPU / 2 GB) started from a snapshot with Chromium and Korean fonts installed, create plus first-screen capture took about 9 seconds end to end through the CLI. The default Ubuntu 26.04 image needs Playwright's Ubuntu 24.04 fallback build and the `fonts-noto-cjk` package.
