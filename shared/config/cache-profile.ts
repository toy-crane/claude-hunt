/**
 * `cacheLife` profile name for the project/cohort `'use cache'` reads.
 *
 * Production uses the built-in `minutes` profile (~60s revalidate), matching
 * the prior `unstable_cache` revalidate window. Outside production — local
 * dev and the Playwright E2E run, which boots `next dev` — the near-instant
 * `seconds` profile is used so admin-seeded fixtures, which never fire
 * `updateTag`, are not masked by a stale cache entry. This replaces the old
 * `productionCache` non-production bypass in `shared/lib/cache.ts`.
 */
export const CACHE_PROFILE =
  process.env.NODE_ENV === "production" ? "minutes" : "seconds";
