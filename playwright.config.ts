import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local so SUPABASE_SECRET_KEY and friends are available to the
// test process (Playwright does not auto-load .env files).
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  // Several student-flow specs share LGE-1 seed cohort state (votes,
  // projects, comments) and race when run in parallel. Keep parallel
  // *across* files (workers > 1) but serialize *within* a file so
  // setup/teardown windows don't overlap on the same DB rows.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [["html"], ["github"]]
    : [["html", { open: "never" }]],
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
