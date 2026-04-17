import { expect, test } from "@playwright/test";

const ALL_COHORTS_RE = /all cohorts/i;
const LGE_1_RE = /LGE-1/;
const LGE_2_RE = /LGE-2/;
const LGE_3_RE = /LGE-3/;
const INFLEARN_RE = /Inflearn/;

const SEEDED_COHORTS: readonly { name: string; re: RegExp }[] = [
  { name: "LGE-1", re: LGE_1_RE },
  { name: "LGE-2", re: LGE_2_RE },
  { name: "Inflearn", re: INFLEARN_RE },
];

test.describe("seed demo data — home page renders three cards", () => {
  test("home page shows exactly three project cards with image/png screenshots", async ({
    page,
  }) => {
    await page.goto("/");

    const cards = page.getByTestId("project-card");
    await expect(cards).toHaveCount(3);

    // Every card's screenshot resolves to a 200 + image/png from the
    // project-screenshots bucket. Iterating via count() + nth() because
    // Locator.all() snapshots once and can desync with retries.
    for (let i = 0; i < 3; i++) {
      const img = cards.nth(i).locator("img").first();
      await expect(img).toBeVisible();
      const src = await img.getAttribute("src");
      if (!src) {
        throw new Error("Project card image has no src");
      }
      const response = await page.request.fetch(src, { method: "HEAD" });
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
    }
  });

  test("the three cards reference three distinct authors", async ({ page }) => {
    await page.goto("/");
    const cards = page.getByTestId("project-card");
    await expect(cards).toHaveCount(3);

    const authors = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const card = cards.nth(i);
      const text = (await card.textContent()) ?? "";
      authors.add(text);
    }
    // Each seeded profile has a unique display_name so per-card textContent
    // (which includes the author name) must also be distinct across cards.
    expect(authors.size).toBe(3);
  });

  for (const cohort of SEEDED_COHORTS) {
    test(`cohort filter '${cohort.name}' returns exactly one card`, async ({
      page,
    }) => {
      await page.goto("/");
      const dropdown = page.getByTestId("cohort-dropdown");
      await dropdown.click();
      await page.getByRole("option", { name: cohort.re }).click();

      const cards = page.getByTestId("project-card");
      await expect(cards).toHaveCount(1);
    });
  }

  test("cohort filter 'LGE-3' returns zero cards", async ({ page }) => {
    await page.goto("/");
    const dropdown = page.getByTestId("cohort-dropdown");
    await dropdown.click();
    await page.getByRole("option", { name: LGE_3_RE }).click();

    await expect(page.getByTestId("project-card")).toHaveCount(0);
  });

  test("restoring 'All cohorts' restores all three cards", async ({ page }) => {
    await page.goto("/");
    const dropdown = page.getByTestId("cohort-dropdown");

    await dropdown.click();
    await page.getByRole("option", { name: LGE_1_RE }).click();
    await expect(page.getByTestId("project-card")).toHaveCount(1);

    await dropdown.click();
    await page.getByRole("option", { name: ALL_COHORTS_RE }).click();
    await expect(page.getByTestId("project-card")).toHaveCount(3);
  });
});
