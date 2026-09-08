import { expect, type Page, test } from "@playwright/test";

/**
 * Guards the font contract in `docs/specs/korean-typography/spec.md`:
 * two font roles (Pretendard sans, Geist Mono for system strings only),
 * no Hangul rendered in a monospace family, self-hosted delivery sliced
 * by unicode-range, and heading weights that do not change with theme.
 */

const DETAIL_PATH = "/projects/00000000-0000-0000-0000-0000000000a1";

/** Hangul syllables, jamo, and compatibility jamo. */
const HANGUL_RE = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const MONO_FAMILY_RE = /mono/i;
const PRETENDARD_RE = /pretendard/i;
const FONT_URL_RE = /\.(?:woff2?|ttf|otf|eot)(?:\?|$)/i;
const JETBRAINS_RE = /jetbrains/i;
const INTER_RE = /^inter/i;
/**
 * The Next.js dev-tools overlay ships its own faces (`__nextjs-Geist`) from
 * `/__nextjs_font/`. They belong to the dev server's UI, not to the product,
 * and are absent from a production build — so they are excluded here.
 */
const DEV_OVERLAY_FAMILY_RE = /^__nextjs-/;
const DEV_OVERLAY_URL_RE = /\/__nextjs_font\//;

/** No single font file may be heavier than this — the full Korean face is ~2 MB. */
const MAX_FONT_FILE_BYTES = 1_000_000;
/** Home is the page the spec puts a first-load budget on. */
const HOME_FONT_BUDGET_BYTES = 600_000;
/**
 * Cumulative layout shift must not regress. Measured on the pre-Pretendard
 * build, every surface sat at 0.0000; 0.1 is the Web Vitals "good" bound and
 * leaves room for dev-server noise without hiding a real regression.
 */
const MAX_CLS = 0.1;

const COHORT_CHIP_RE = /LG전자/;

const WEIGHT_HERO = "600";
const WEIGHT_ROW = "500";

interface FontRequest {
  size: number;
  url: string;
}

interface HangulInMono {
  className: string;
  family: string;
  tagName: string;
  text: string;
}

interface SurfaceReport {
  cls: number;
  declaredFamilies: string[];
  fonts: FontRequest[];
  hangulInMono: HangulInMono[];
}

function watchFontRequests(page: Page): FontRequest[] {
  const fonts: FontRequest[] = [];
  page.on("response", async (response) => {
    const url = response.url();
    const isFont =
      FONT_URL_RE.test(url) || response.request().resourceType() === "font";
    if (!isFont) {
      return;
    }
    let size = 0;
    try {
      size = (await response.body()).length;
    } catch {
      // Response body already discarded (redirect, aborted) — count it as 0.
    }
    fonts.push({ url, size });
  });
  return fonts;
}

async function readSurface(page: Page): Promise<Omit<SurfaceReport, "fonts">> {
  // Let webfonts swap in and any late layout settle before sampling.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  return page.evaluate(
    (sources: { hangul: string; mono: string }) => {
      const hangul = new RegExp(sources.hangul);
      const mono = new RegExp(sources.mono, "i");
      const hangulInMono: HangulInMono[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );
      const seen = new Set<Element>();
      let node = walker.nextNode();
      while (node) {
        const text = (node.textContent ?? "").trim();
        const element = node.parentElement;
        if (text && hangul.test(text) && element && !seen.has(element)) {
          seen.add(element);
          const family = getComputedStyle(element)
            .fontFamily.split(",")[0]
            .replace(/["']/g, "")
            .trim();
          if (mono.test(family)) {
            hangulInMono.push({
              className: element.getAttribute("class") ?? "",
              family,
              tagName: element.tagName,
              text: text.slice(0, 60),
            });
          }
        }
        node = walker.nextNode();
      }

      const cls = performance
        .getEntriesByType("layout-shift")
        .filter(
          (entry) =>
            !(entry as unknown as { hadRecentInput: boolean }).hadRecentInput
        )
        .reduce(
          (sum, entry) => sum + (entry as unknown as { value: number }).value,
          0
        );

      const declaredFamilies = new Set<string>();
      for (const face of document.fonts) {
        declaredFamilies.add(face.family);
      }

      return { cls, declaredFamilies: [...declaredFamilies], hangulInMono };
    },
    { hangul: HANGUL_RE.source, mono: MONO_FAMILY_RE.source }
  );
}

async function loadSurface(page: Page, path: string): Promise<SurfaceReport> {
  const fonts = watchFontRequests(page);
  await page.goto(path, { waitUntil: "networkidle" });
  const rest = await readSurface(page);
  return { ...rest, fonts };
}

function describeHangulInMono(found: HangulInMono[]): string {
  return found
    .map((item) => `<${item.tagName}> "${item.text}" → ${item.family}`)
    .join("\n");
}

const SURFACES: Array<{
  height: number;
  name: string;
  path: string;
  width: number;
}> = [
  { height: 800, name: "홈", path: "/", width: 1280 },
  {
    height: 800,
    name: "프로젝트 보드(데스크톱)",
    path: "/projects",
    width: 1280,
  },
  { height: 844, name: "프로젝트 보드(모바일)", path: "/projects", width: 390 },
  { height: 800, name: "프로젝트 상세", path: DETAIL_PATH, width: 1280 },
  { height: 800, name: "로그인", path: "/login", width: 1280 },
  { height: 800, name: "이용약관", path: "/terms", width: 1280 },
  { height: 800, name: "개인정보 처리방침", path: "/privacy", width: 1280 },
];

for (const surface of SURFACES) {
  test(`${surface.name}에서 한글이 모노 글꼴로 표시되지 않는다`, async ({
    page,
  }) => {
    await page.setViewportSize({
      height: surface.height,
      width: surface.width,
    });
    const report = await loadSurface(page, surface.path);
    expect(
      report.hangulInMono,
      `한글이 모노로 렌더링된 요소:\n${describeHangulInMono(report.hangulInMono)}`
    ).toEqual([]);
  });

  test(`${surface.name}의 글꼴은 서비스가 직접 제공하고 조각으로 나뉜다`, async ({
    page,
  }) => {
    await page.setViewportSize({
      height: surface.height,
      width: surface.width,
    });
    const report = await loadSurface(page, surface.path);

    const fonts = report.fonts.filter(
      (font) => !DEV_OVERLAY_URL_RE.test(font.url)
    );
    const declared = report.declaredFamilies.filter(
      (family) => !DEV_OVERLAY_FAMILY_RE.test(family)
    );
    const total = fonts.reduce((sum, font) => sum + font.size, 0);
    // Recorded for every surface; the spec's hard budget applies to 홈.
    console.log(
      `[typography] ${surface.name}: 글꼴 ${fonts.length}개, ${total} B (${(total / 1024).toFixed(1)} KB), 최대 ${Math.max(0, ...fonts.map((font) => font.size))} B, CLS ${report.cls.toFixed(4)}, 패밀리 ${declared.join(" / ")}`
    );

    const external = fonts.filter(
      (font) => !font.url.startsWith("http://localhost:3000")
    );
    expect(external.map((font) => font.url)).toEqual([]);

    const oversized = fonts.filter((font) => font.size >= MAX_FONT_FILE_BYTES);
    expect(
      oversized.map((font) => `${font.url} (${font.size} B)`),
      "1MB 이상인 글꼴 파일"
    ).toEqual([]);

    expect(declared.filter((family) => JETBRAINS_RE.test(family))).toEqual([]);
    expect(declared.filter((family) => INTER_RE.test(family))).toEqual([]);
    expect(
      declared.some((family) => PRETENDARD_RE.test(family)),
      `선언된 글꼴: ${declared.join(", ")}`
    ).toBe(true);
    expect(
      declared.every(
        (family) => PRETENDARD_RE.test(family) || MONO_FAMILY_RE.test(family)
      ),
      `선언된 글꼴: ${declared.join(", ")}`
    ).toBe(true);

    if (surface.path === "/" && surface.width === 1280) {
      expect(total).toBeLessThanOrEqual(HOME_FONT_BUDGET_BYTES);
    }
    expect(report.cls).toBeLessThanOrEqual(MAX_CLS);
  });
}

/**
 * The class filter puts a Korean label inside the command string, and the
 * signed-in surfaces carry the my-projects table and the submit form. None
 * of them is reachable from the anonymous sweep above.
 */
const AUTHED_SURFACES: Array<{ name: string; path: string }> = [
  {
    name: "설정",
    path: "/auth/dev-login?email=alice@example.com&next=/settings",
  },
  {
    name: "프로젝트 제출",
    path: "/auth/dev-login?email=alice@example.com&next=/projects/new",
  },
];

for (const surface of AUTHED_SURFACES) {
  test(`${surface.name}에서 한글이 모노 글꼴로 표시되지 않는다`, async ({
    page,
  }) => {
    const report = await loadSurface(page, surface.path);
    expect(
      report.hangulInMono,
      `한글이 모노로 렌더링된 요소:\n${describeHangulInMono(report.hangulInMono)}`
    ).toEqual([]);
  });
}

test("클래스를 고른 보드에서도 한글이 모노 글꼴로 표시되지 않는다", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/projects");
  await page
    .getByTestId("cohort-chips")
    .getByRole("button", { name: COHORT_CHIP_RE })
    .first()
    .click();
  // The prompt line now carries the Korean class label inside the command.
  await expect(page.getByTestId("prompt-line")).toContainText('--class="');
  const report = await readSurface(page);
  expect(
    report.hangulInMono,
    `한글이 모노로 렌더링된 요소:\n${describeHangulInMono(report.hangulInMono)}`
  ).toEqual([]);
});

test("홈 제목은 Pretendard 600으로 렌더링된다", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { name: "이달의 클로드 헌트" });
  await expect(heading).toBeVisible();
  const style = await heading.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { family: computed.fontFamily, weight: computed.fontWeight };
  });
  expect(style.family.split(",")[0].replace(/["']/g, "").trim()).toMatch(
    PRETENDARD_RE
  );
  expect(style.weight).toBe(WEIGHT_HERO);
});

test("보드 행 제목은 Pretendard 500으로 렌더링된다", async ({ page }) => {
  await page.goto("/projects");
  const title = page
    .getByTestId("project-card")
    .first()
    .getByTestId("project-card-desktop")
    .getByRole("link")
    .nth(1);
  await expect(title).toBeVisible();
  const style = await title.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { family: computed.fontFamily, weight: computed.fontWeight };
  });
  expect(style.family.split(",")[0].replace(/["']/g, "").trim()).toMatch(
    PRETENDARD_RE
  );
  expect(style.weight).toBe(WEIGHT_ROW);
});

test("시스템 문자열은 모노 글꼴로 남는다", async ({ page }) => {
  await page.goto("/projects");
  const families = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector);
      return element
        ? getComputedStyle(element)
            .fontFamily.split(",")[0]
            .replace(/["']/g, "")
            .trim()
        : null;
    };
    return {
      columnHead: read('[data-testid="project-grid-header"]'),
      logo: read('a[aria-label="claude-hunt 홈"]'),
      promptLine: read('[data-testid="prompt-line"]'),
    };
  });
  expect(families.promptLine).toMatch(MONO_FAMILY_RE);
  expect(families.logo).toMatch(MONO_FAMILY_RE);
  expect(families.columnHead).toMatch(MONO_FAMILY_RE);
});

test("제목 굵기는 다크 테마에서도 같다", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { name: "이달의 클로드 헌트" });
  const light = await heading.evaluate(
    (element) => getComputedStyle(element).fontWeight
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  const dark = await heading.evaluate(
    (element) => getComputedStyle(element).fontWeight
  );
  expect(dark).toBe(light);
});
