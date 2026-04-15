# `next/image` with remote sources (including localhost)

How to render optimized `<Image>` components pointing at a remote host, including the edge cases that make "it worked in dev, broke in prod" (and vice versa) surprisingly common.

## The three gates an image URL must pass

For `next/image` to serve an optimized variant of a remote URL, **every** one of these must be true:

1. The URL matches an entry in `images.remotePatterns` (protocol, hostname, port, pathname — all exact match).
2. If the URL's hostname is a private or loopback IP (`127.0.0.1`, `localhost`, `10.*`, `192.168.*`, etc.), `images.dangerouslyAllowLocalIP` is `true`.
3. The optimizer's Node process can actually reach that URL over the network.

Most "why is my image broken" debugging comes down to which of these failed. The error messages do not always distinguish them clearly.

## Gate 1 — `remotePatterns` is exact-match

`remotePatterns.hostname`, `protocol`, `port`, and `pathname` are matched literally. A few consequences that bite people:

- `localhost` and `127.0.0.1` are different hostnames. Supabase, Strapi, and most local dev tools emit `127.0.0.1`; browsers often display `localhost`. If you configure one, the other will fail.
- `port` is a string, exact-match. An empty string means "default port for the protocol" (80/443). You cannot omit `port` and expect it to match any port.
- `pathname` supports `**` for recursive wildcards. Scope it as tightly as you can — `pathname: "/**"` is a soft SSRF footgun because it lets `<Image src>` point at any path on the host (auth endpoints, internal APIs, metrics).
- Multiple entries are OR-combined. Add one per (protocol, hostname, port) tuple you actually need.

When in doubt, paste the full URL you are rendering and the `remotePatterns` block side-by-side and check each segment.

## Gate 2 — local / private IPs are blocked by default (Next.js 16+)

Starting in Next.js 16, the optimizer refuses to fetch sources on loopback and private network ranges unless you set `images.dangerouslyAllowLocalIP: true`. This is an SSRF guard — without it, a compromised frontend could use the optimizer as a proxy into your internal network.

Important: `remotePatterns` matching `127.0.0.1` is **not sufficient** on its own. The request is rejected before pattern matching.

### When to flip the flag

- **Local dev against a local backend** (Docker, `supabase start`, a local Rails/Django app, etc.) — yes, flip it on, but only in that build.
- **Production** — leave it off. There is almost no case where your deployed servers should be optimizing images served from private IPs.
- **Self-hosted Next.js inside a private network** where the image source is another internal host — flip it on, and scope `remotePatterns` as tightly as you can (specific hostname, specific pathname prefix).

### How to scope it safely

The cheapest safe pattern is to derive the flag from the same env that holds your image origin:

```
// next.config.mjs
const imageHostUrl = new URL(process.env.NEXT_PUBLIC_IMAGE_HOST);
const isLocalHost =
  imageHostUrl.hostname === "127.0.0.1" ||
  imageHostUrl.hostname === "localhost";

export default {
  images: {
    dangerouslyAllowLocalIP: isLocalHost,
    remotePatterns: [/* ... */],
  },
};
```

This way, a production build pointed at a real hostname automatically leaves the flag off — there is no path where a misconfigured dev build sneaks the flag into production.

Do **not** key the flag off `NODE_ENV === "development"`. You usually want `next build && next start` locally to behave the same as dev, and `NODE_ENV` will be `production` during that build.

## Gate 3 — network reachability

The optimizer fetches the source image from a Node process, not from the browser. That means:

- `127.0.0.1` inside a Docker-ised Next.js container points at the container, not the host. If the image source runs on the host, you need `host.docker.internal` (macOS/Windows) or the host's LAN IP (Linux) instead.
- On Vercel (or any serverless host), private IPs never reach your development machine — there is no route. This is rarely a problem in practice because you would not configure a private IP for a deployed app, but it catches people who hardcode both envs into the same `remotePatterns` array and expect the production build to "just ignore" the local entry.
- Self-signed HTTPS certs can cause the fetch to fail with an opaque 502 from the optimizer. Prefer plain HTTP for local hosts, or install the cert into Node's trust store.

## Writing `<Image>` components

Rules that keep the optimizer happy and CLS at zero:

- **Always** provide `width` and `height` (or `fill` with a positioned parent). Without them the browser cannot reserve space and you get layout shift.
- `priority` eagerly loads the image and adds an LCP preload. Use it **only** on images that are above the fold on first paint — typically zero, one, or a small handful per route. Sprinkling `priority` everywhere dilutes the preload signal and Next.js will log a warning.
- `sizes` is how you tell the optimizer which variant to serve at each breakpoint. If you omit it on a responsive image, Next.js picks the largest variant and you ship 2–4× the bytes needed. The formula should mirror your real layout breakpoints, not a generic "responsive" incantation.
- Prefer explicit `width`/`height` props over `fill` when the container already enforces aspect ratio. `fill` requires `position: relative` on the parent and is easier to get wrong.

## Testing components that use `next/image`

Vitest + jsdom tests have two complications:

1. The real `next/image` rewrites `src` to `/_next/image?url=...&w=...`, so any assertion on `img.src` breaks.
2. Some linters (biome's `noImgElement`) flag `<img>` in mocks, and formatters will sometimes strip the `import Image from "next/image"` line if they think it's unused — that line then resolves `<Image>` to the global `window.Image` DOM constructor, and React throws "Objects are not valid as a React child (found: [object HTMLImageElement])".

A minimal mock that sidesteps both:

```
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));
```

Tests then use `getByLabelText(alt)` and `getAttribute("data-src")` — both robust against any future loader changes.

Whether to put this mock inline in each test file or once in `vitest.setup.ts` depends on your setup: a top-level `vi.mock` in the setup file can fail to route through the test file's React instance and produce the same HTMLImageElement error above. If you hit that, fall back to inline mocks in each affected test file.

## Diagnostic checklist

When a `next/image` stops working, in this order:

1. **Is the import present?** A missing `import Image from "next/image"` resolves to `window.Image` and blows up tests with an `HTMLImageElement` error.
2. **What does the URL look like at runtime?** `console.log` the `src` on the server. Compare every segment (protocol, hostname, port, pathname) against `remotePatterns`.
3. **Is the hostname a private IP?** If yes, `dangerouslyAllowLocalIP` must be `true` in the build.
4. **Can the Node process reach the URL?** Shell into the runtime and `curl` the source URL. Container networking and self-signed certs are the two usual culprits.
5. **Is `sizes` missing on a responsive image?** Not a correctness bug, but a performance one — shows up as oversized payloads in the network panel.
