import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const OUT =
  "/Users/toycrane/Documents/Projects/claude-hunt/.claude/worktrees/feat/fit-login-onboarding/artifacts/fit-login-onboarding/ui-review";

const pages = [
  { id: "screen-login", path: "/login" },
  { id: "screen-onboarding", path: "/onboarding" },
];

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 900 },
];

const themes = ["light", "dark"];

async function capture() {
  const browser = await chromium.launch();

  for (const page of pages) {
    mkdirSync(join(OUT, page.id), { recursive: true });

    for (const vp of viewports) {
      for (const theme of themes) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
        });
        const tab = await ctx.newPage();
        await tab.goto(`${BASE}${page.path}`, { waitUntil: "networkidle" });
        // Wait a moment for animations to settle
        await tab.waitForTimeout(800);
        const outPath = join(OUT, page.id, `${vp.name}-${theme}.png`);
        await tab.screenshot({ path: outPath, fullPage: true });
        console.log("saved", outPath);
        await ctx.close();
      }
    }
  }

  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
