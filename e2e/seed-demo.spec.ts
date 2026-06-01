import { expect, test } from "@playwright/test";

const ALL_COHORTS_RE = /모든 클래스/;
const LGE_1_RE = /LG전자 1기/;
const LGE_2_RE = /LG전자 2기/;
const LGE_3_RE = /LG전자 3기/;
const INFLEARN_RE = /인프런/;

// The three demo projects seeded by `supabase/seed.sql`. Asserting on the
// titles instead of strict counts keeps the spec robust against student
// tests submitting projects in parallel from other spec files.
const SEEDED_COHORTS: readonly {
  name: string;
  re: RegExp;
  projectTitle: string;
}[] = [
  { name: "LGE-1", re: LGE_1_RE, projectTitle: "Paint Studio" },
  { name: "LGE-2", re: LGE_2_RE, projectTitle: "Note Keeper" },
  { name: "Inflearn", re: INFLEARN_RE, projectTitle: "Focus Timer" },
];

test.describe("seed demo data — projects board renders seeded cards", () => {
  test("projects board renders the three seeded project cards with image/png screenshots", async ({
    page,
  }) => {
    await page.goto("/projects");

    for (const { projectTitle } of SEEDED_COHORTS) {
      const card = page
        .getByTestId("project-card")
        .filter({ hasText: projectTitle })
        .first();
      const img = card.locator("img").first();
      await expect(img).toBeVisible();
      const src = await img.getAttribute("src");
      if (!src) {
        throw new Error(`Project card '${projectTitle}' image has no src`);
      }
      const response = await page.request.fetch(src, { method: "HEAD" });
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
    }
  });

  test("the three seeded cards reference three distinct authors", async ({
    page,
  }) => {
    await page.goto("/projects");
    const authors = new Set<string>();
    for (const { projectTitle } of SEEDED_COHORTS) {
      const card = page
        .getByTestId("project-card")
        .filter({ hasText: projectTitle })
        .first();
      authors.add((await card.textContent()) ?? "");
    }
    expect(authors.size).toBe(3);
  });

  for (const cohort of SEEDED_COHORTS) {
    test(`cohort filter '${cohort.name}' surfaces its seeded project`, async ({
      page,
    }) => {
      await page.goto("/projects");
      const chips = page.getByTestId("cohort-chips");
      await chips.getByRole("button", { name: cohort.re }).click();

      await expect(
        page
          .getByTestId("project-card")
          .filter({ hasText: cohort.projectTitle })
          .first()
      ).toBeVisible();
    });
  }

  test("cohort filter 'LGE-3' surfaces no seeded cards", async ({ page }) => {
    await page.goto("/projects");
    const chips = page.getByTestId("cohort-chips");
    await chips.getByRole("button", { name: LGE_3_RE }).click();

    for (const { projectTitle } of SEEDED_COHORTS) {
      await expect(
        page
          .getByTestId("project-card")
          .filter({ hasText: projectTitle })
          .first()
      ).not.toBeVisible();
    }
  });

  test("restoring 'All cohorts' restores all three seeded cards", async ({
    page,
  }) => {
    await page.goto("/projects");
    const chips = page.getByTestId("cohort-chips");

    await chips.getByRole("button", { name: LGE_1_RE }).click();
    await expect(
      page
        .getByTestId("project-card")
        .filter({ hasText: "Paint Studio" })
        .first()
    ).toBeVisible();

    await chips.getByRole("button", { name: ALL_COHORTS_RE }).click();
    for (const { projectTitle } of SEEDED_COHORTS) {
      await expect(
        page
          .getByTestId("project-card")
          .filter({ hasText: projectTitle })
          .first()
      ).toBeVisible();
    }
  });
});
