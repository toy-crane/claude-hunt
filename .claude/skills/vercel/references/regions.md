# Function Deploy Regions

## Current setting

```json
// vercel.json
{
  "regions": ["icn1"]
}
```

`icn1` = **Seoul (Incheon)**. This is the primary region for every serverless function in the project.

## Why `icn1`

- **User base**: primary audience is Korea; `icn1` is the closest edge location to most visitors.
- **Database proximity**: the Supabase project also runs in Seoul. Co-locating Vercel functions and the DB avoids cross-region round trips (~100ms+ penalty per query).
- **One region, one latency story**: single-region simplifies reasoning about tail latency. Multi-region only pays off when traffic is globally distributed, which is not the case today.

**Change only if** the user base or DB region changes. Keep Vercel and Supabase regions in sync.

## Setting the region

```json
{
  "regions": ["<region-code>"]
}
```

- Plain `regions` applies to all serverless functions.
- For per-function overrides, use the `functions` block (see below). This project does not currently use it.

## Common region codes

| Code | Location |
|------|----------|
| `icn1` | Seoul (current) |
| `hnd1` | Tokyo |
| `sfo1` | San Francisco |
| `iad1` | Washington DC |
| `fra1` | Frankfurt |
| `lhr1` | London |
| `syd1` | Sydney |

Full list: <https://vercel.com/docs/edge-network/regions>

## Per-function region override (currently unused)

If a specific route/handler needs a different region:

```json
{
  "regions": ["icn1"],
  "functions": {
    "app/api/global-route/route.ts": {
      "regions": ["iad1"]
    }
  }
}
```

Only reach for this when a single endpoint has a genuinely global audience AND can tolerate the resulting cross-region DB latency. For the current app shape, this is not needed.

## Edge runtime (not the same as regions)

Edge runtime (Next.js `runtime: 'edge'`) runs at **all** edge locations automatically and ignores the `regions` field. It is a separate choice that trades Node APIs + stateful DB pooling for cold-start and global presence. This project uses the **default Node runtime** — the `regions` setting is what pins the location.

## Related

- `.vercel/project.json` has no region info — regions are repo-declared in `vercel.json`.
- Supabase region is set at project creation on the Supabase dashboard and cannot be changed afterwards.
- Keeping the two regions aligned is a manual check — there is no automation for it.
