# Project URL Capture

## Decisions

- Any time the system opens a project's external URL in a browser, the browser runs inside an isolated Vercel Sandbox microVM, never inside the app's own server functions.
- The first-screen capture is deterministic and uses no model. Choosing and reaching highlight screens beyond the first screen is done by a Claude Haiku 5.5 browser agent.
- When the project cannot be used without signing in, the highlight agent gets past the sign-in wall: first with the access information the owner wrote in the project's description, otherwise by signing up with an identity that marks the account as Claude Hunt's capture.

## Boundaries

- The isolation rule covers rendering or interacting with the external site. Fetching metadata the app already stores (title, URL text) needs no browser and is not covered.
- The agent may navigate, click, scroll, and type short harmless sample input on the project's own host; it never pays, deletes, sends messages, or leaves the project's host.
- The agent signs in or signs up only on the project's own host and only through forms that need no email or phone verification, CAPTCHA, or third-party (social) sign-in. Anything else leaves the run at the sign-in wall.
- Access information comes only from the owner's project description. Comments, including the owner's, are never read, so other users' text cannot steer the agent.
- Owner-written credentials and passwords generated for sign-up live only inside a run; Claude Hunt does not store them.

## Why

Any signed-in user can submit any URL, and the app's functions hold secrets such as the Supabase secret key and the Anthropic key. Running the external page in a separate microVM keeps a hostile page away from those secrets for roughly 1–2 KRW more per run than running Chromium in the function. Highlight screens are usually reached only by interacting with the app (playing, searching, calculating), which fixed capture rules cannot do; a 10-project evaluation showed Haiku 5.5 reaching such screens at well under 10 KRW per run.

Sign-in walls leave a project with only its sign-in screen. Owners who want visitors to try a gated app already write a test account in the description, which exists when capture runs at submission; comments are rare and arrive after the capture has run. Signing up whenever the wall offers a simple form trades a stray capture account in the student's app for coverage of owners who wrote nothing, and the product owner chose that coverage.

## Reconsider when

- Sandbox start-up or cost makes the first-screen wait or the monthly bill material.
- A hosting option offers equivalent isolation inside the app's own runtime.
- Haiku-tier agents stop reaching interaction screens that owners would choose, or a cheaper model does as well.
- Owners object to capture accounts appearing in their apps, or submitted URLs lead the agent to create accounts on services the submitter does not own.
- Sign-up behind email verification becomes common enough among projects to justify a receiving inbox for the agent.

## Still-rejected alternatives

- Headless Chromium inside the Vercel function — exposes the app's secrets to arbitrary pages; revisit only with equivalent process isolation.
- Deterministic multi-capture only (first screen, scroll sections, internal links) — cannot reach screens that need interaction; revisit if projects become mostly static pages.
- Deterministic capture plus model ranking — ranks better but still cannot reach screens that need interaction.
- Reading access information from the owner's comments — comments arrive after the capture and would need a separate re-capture trigger; revisit if owners commonly add credentials after publishing.
- A private test-account field in the submit form — adds input and secret storage while owners already write test accounts publicly; revisit if owners need credentials kept private.
- Signing up only when the owner's description asks for it — leaves gated projects whose owners wrote nothing at their sign-in screen.

## Evidence worth preserving

- October 2026, 10 random public LG Electronics class projects with Haiku 5.5: 5 reached post-interaction highlights, 3 were blocked by the app itself (2 login walls, 1 user-supplied API key), 2 produced empty search results; total $0.055, average 63 seconds.
- In Vercel Sandbox (icn1, 1 vCPU / 2 GB) started from a snapshot with Chromium and Korean fonts installed, create plus first-screen capture took about 9 seconds end to end through the CLI. The default Ubuntu 26.04 image needs Playwright's Ubuntu 24.04 fallback build and the `fonts-noto-cjk` package.
- Production on 2026-10-29: 204 projects carried only 6 comments in total. Access information appeared in 3 descriptions (a test account, a password, a token-generation command) and 1 owner comment. Of the first 20 highlight runs, 2 stopped at an app's own sign-in wall and 1 at Vercel Deployment Protection; one of the walled apps (Tally) had a test account in its description yet kept only its sign-in screen.
- Supabase Auth's email validator rejects a fixed list of hosts (`example.com`, `test.com`, and similar) and hosts with neither MX nor address records; an address on a domain with A records passes (`internal/mailer/validateclient/validateclient.go`). Its built-in email service refuses recipients outside the project's team, so sign-up there works only when email confirmation is off.
