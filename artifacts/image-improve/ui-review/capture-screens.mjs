import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = '/Users/toycrane/Documents/Projects/claude-hunt/.claude/worktrees/feat/image-improve/artifacts/image-improve/ui-review/screen-0';

await mkdir(ARTIFACTS_DIR, { recursive: true });

const configs = [
  { viewport: { width: 375, height: 812 }, theme: 'light', label: 'mobile-light' },
  { viewport: { width: 375, height: 812 }, theme: 'dark', label: 'mobile-dark' },
  { viewport: { width: 1280, height: 900 }, theme: 'light', label: 'desktop-light' },
  { viewport: { width: 1280, height: 900 }, theme: 'dark', label: 'desktop-dark' },
];

const browser = await chromium.launch({ headless: true });

for (const config of configs) {
  console.log(`Capturing ${config.label}...`);
  const context = await browser.newContext({
    viewport: config.viewport,
    colorScheme: config.theme === 'dark' ? 'dark' : 'light',
  });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // Set theme class
  await page.evaluate((theme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, config.theme);

  await page.waitForTimeout(500);

  // Take baseline screenshot (no hover)
  const outputPath = path.join(ARTIFACTS_DIR, `${config.label}.png`);
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`  Saved: ${outputPath}`);

  // For desktop only, take a hover screenshot
  if (config.viewport.width >= 1280) {
    // Hover over the first thumbnail
    const thumbnail = page.locator('[data-testid="project-card-thumb"]').first();
    await thumbnail.hover();
    await page.waitForTimeout(400); // wait for openDelay=150ms + animation

    const hoverPath = path.join(ARTIFACTS_DIR, `${config.label}-hover.png`);
    await page.screenshot({ path: hoverPath, fullPage: false });
    console.log(`  Saved hover: ${hoverPath}`);
  }

  await context.close();
}

await browser.close();
console.log('Done.');
