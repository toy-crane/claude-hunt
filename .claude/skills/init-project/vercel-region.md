# Pin Vercel Function Region to Supabase Region

When Vercel's function region differs from your Supabase region, every database call inside SSR/RSC pays a cross-region round-trip — typically 150–250ms each way for transpacific. Vercel's default function region is `iad1` (Washington, D.C.), so any Supabase project outside US East suffers.

**Symptom**: TTFB stays high (700ms+) even on simple pages, and Lighthouse `x-vercel-id` shows two different region codes.

## Find your Supabase region

```bash
supabase projects list
```

The **REGION** column shows where each project lives (e.g. `Northeast Asia (Seoul)` = `ap-northeast-2`).

## Find the matching Vercel region code

Full list: https://vercel.com/docs/edge-network/regions

Common pairings:

| Supabase region | Vercel code |
|---|---|
| Northeast Asia (Seoul) — `ap-northeast-2` | `icn1` |
| Northeast Asia (Tokyo) — `ap-northeast-1` | `hnd1` |
| US East (N. Virginia) — `us-east-1` | `iad1` *(default — no change needed)* |
| US West (Oregon) — `us-west-2` | `pdx1` |
| Europe (Frankfurt) — `eu-central-1` | `fra1` |
| Europe (London) — `eu-west-2` | `lhr1` |
| Europe (Paris) — `eu-west-3` | `cdg1` |

## Update `vercel.json`

Add or merge the `regions` field:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["<your-vercel-region-code>"]
}
```

If `vercel.json` already exists, preserve other fields and add `regions` alongside them.

Commit it. Every `vercel deploy` (CLI or git push) will pick it up — no Dashboard click needed.

## Verify after the next deploy

```bash
curl -sI https://<your-domain>/ | grep x-vercel-id
```

`x-vercel-id: <edge>::<function>::...` — both slots should show the same region as your Supabase. If the second slot is still `iad1` and your DB isn't in US East, the config didn't apply.

## Plan caveat

- **Hobby**: single region only. `regions: ["icn1"]` works fine.
- **Pro / Enterprise**: multi-region + `functionFailoverRegions` supported.
