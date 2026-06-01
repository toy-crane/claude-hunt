import { test as setup } from "@playwright/test";

const DRAFT_STATE = "e2e/.auth/draft.json";

/**
 * Enable Draft Mode once and persist the `__prerender_bypass` cookie as the
 * shared storageState. Every test context then reads fresh (uncached) data
 * from `use cache` functions — required because specs seed through the admin
 * client, which never fires `updateTag` to bust the cache.
 */
setup("enable draft mode", async ({ page, context }) => {
  await page.goto("/api/draft");
  await context.storageState({ path: DRAFT_STATE });
});
