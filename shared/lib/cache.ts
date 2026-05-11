import type { CacheTag } from "@shared/config/cache-tags";
import { unstable_cache } from "next/cache";

interface ProductionCacheOptions {
  revalidate: number;
  tags: CacheTag[];
}

/**
 * Wraps a loader in `unstable_cache` only when running in production.
 *
 * E2E and dev seed data through the admin Supabase client, which bypasses
 * the app's server actions and therefore never fires `updateTag` to bust
 * the cache. Without this bypass, the cached read would mask freshly
 * inserted rows during the configured TTL — every test that seeds + reads
 * within the window would flake.
 */
export function productionCache<R>(
  loader: () => Promise<R>,
  keyParts: string[],
  options: ProductionCacheOptions
): () => Promise<R> {
  if (process.env.NODE_ENV !== "production") {
    return loader;
  }
  return unstable_cache(loader, keyParts, options);
}
