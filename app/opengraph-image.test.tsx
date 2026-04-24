import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import OpenGraphImage, {
  alt,
  contentType,
  OgElement,
  size,
} from "./opengraph-image";

interface ImageResponseOpts {
  fonts?: Array<{ name: string; weight?: number; style?: string }>;
  height: number;
  width: number;
}

const PRETENDARD_PATTERN = /pretendard/i;
const NOTO_SANS_KR_PATTERN = /noto\s*sans\s*kr/i;

// Capture what `next/og`'s ImageResponse was called with.
const capturedImageResponses: Array<{
  element: ReactElement;
  opts: ImageResponseOpts;
}> = [];
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: ReactElement, opts: ImageResponseOpts) {
      capturedImageResponses.push({ element, opts });
    }
  },
}));

// Use 6 placeholder projects for OgElement assertions — Task 3 replaces the
// default with live data.
const PLACEHOLDER_PROJECTS = [
  {
    id: "p1",
    title: "시장 리포트",
    tagline:
      "한국/미국 주식 포트폴리오를 관리하고, AI가 매일 시장 마감 리포트를 자동 생성",
    author_display_name: "토이크레인",
    vote_count: 1,
    screenshotUrl: "https://cdn.example.com/p1.png",
  },
  {
    id: "p2",
    title: "포켓몬 마스터 퀴즈",
    tagline:
      "1세대 포켓몬 151종의 실루엣을 보고 4지선다로 이름을 맞추는 퀴즈 게임",
    author_display_name: "토이크레인",
    vote_count: 1,
    screenshotUrl: "https://cdn.example.com/p2.png",
  },
  {
    id: "p3",
    title: "Vocabulary Builder",
    tagline: "영영사전 기반으로 단어를 학습하고 복습 퀴즈로 암기를 관리",
    author_display_name: "토이크레인",
    vote_count: 1,
    screenshotUrl: "https://cdn.example.com/p3.png",
  },
  {
    id: "p4",
    title: "Sky Dodge",
    tagline: "Flappy Bird 스타일의 비행기 장애물 회피 웹 게임",
    author_display_name: "토이크레인",
    vote_count: 0,
    screenshotUrl: "https://cdn.example.com/p4.png",
  },
  {
    id: "p5",
    title: "Rampage",
    tagline: "SSH로 서버 메모리를 실시간 모니터링하는 대시보드",
    author_display_name: "토이크레인",
    vote_count: 0,
    screenshotUrl: "https://cdn.example.com/p5.png",
  },
  {
    id: "p6",
    title: "랜덤채팅 + AI",
    tagline: "상대가 AI인지 사람인지 판별하는 익명 채팅 게임",
    author_display_name: "토이크레인",
    vote_count: 0,
    screenshotUrl: "https://cdn.example.com/p6.png",
  },
];

const TERRACOTTA_RGB = "rgb(193, 95, 60)";
const RANK_1_RGB = "rgb(245, 158, 11)";
const RANK_2_RGB = "rgb(161, 161, 170)";
const RANK_3_RGB = "rgb(194, 65, 12)";

function renderOg() {
  return render(OgElement({ projects: PLACEHOLDER_PROJECTS }));
}

describe("app/opengraph-image (1200x630)", () => {
  beforeEach(() => {
    capturedImageResponses.length = 0;
  });

  it("exports 1200x630 size and PNG content type", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("declares an alt text that names the product", () => {
    expect(alt.toLowerCase()).toContain("claude-hunt");
  });

  it("renders the full '> claude-hunt_' wordmark", () => {
    const { container } = renderOg();
    const text = container.textContent ?? "";
    expect(text).toContain(">");
    expect(text).toContain("claude-hunt");
    expect(text).toContain("_");
  });

  it("renders every literal copy string from the 2B design", () => {
    const { container } = renderOg();
    const text = container.textContent ?? "";
    expect(text).toContain("함께 배우는 사람들의 프로젝트.");
    expect(text).toContain("마음에 드는 프로젝트에 응원을 보내주세요.");
    expect(text).toContain("지금 인기 프로젝트");
    expect(text).toContain("claude-hunt.com");
  });

  it("applies terracotta to the '>' and '_' wordmark glyphs", () => {
    const { container } = renderOg();
    const spans = Array.from(container.querySelectorAll("span"));
    const promptSpan = spans.find((s) => s.textContent === ">");
    const cursorSpan = spans.find((s) => s.textContent === "_");
    expect(promptSpan?.style.color).toBe(TERRACOTTA_RGB);
    expect(cursorSpan?.style.color).toBe(TERRACOTTA_RGB);
  });

  it("paints the three trend-row dots in gold / silver / bronze", () => {
    const { container } = renderOg();
    const trendDots = Array.from(
      container.querySelectorAll('[data-og-role="trend-dot"]')
    ) as HTMLElement[];
    expect(trendDots).toHaveLength(3);
    expect(trendDots[0].style.color).toBe(RANK_1_RGB);
    expect(trendDots[1].style.color).toBe(RANK_2_RGB);
    expect(trendDots[2].style.color).toBe(RANK_3_RGB);
  });

  it("labels top-3 cards with 1st / 2nd / 3rd badges in the matching colors", () => {
    const { container } = renderOg();
    const badges = Array.from(
      container.querySelectorAll('[data-og-role="rank-badge"]')
    ) as HTMLElement[];
    expect(badges).toHaveLength(3);
    expect(badges[0].textContent).toBe("1st");
    expect(badges[1].textContent).toBe("2nd");
    expect(badges[2].textContent).toBe("3rd");
    expect(badges[0].style.color).toBe(RANK_1_RGB);
    expect(badges[1].style.color).toBe(RANK_2_RGB);
    expect(badges[2].style.color).toBe(RANK_3_RGB);
    // cards at positions 4, 5, 6 must have no badge
    const allCards = container.querySelectorAll('[data-og-role="card"]');
    expect(allCards).toHaveLength(6);
  });

  it("rotates the card grid wrapper by -7deg (design-specified tilt)", () => {
    const { container } = renderOg();
    const grid = container.querySelector(
      '[data-og-role="cards"]'
    ) as HTMLElement;
    expect(grid.style.transform).toContain("rotate(-7deg)");
  });

  it("renders a fade overlay on the right half with the design's gradient stops", () => {
    const { container } = renderOg();
    const fade = container.querySelector(
      '[data-og-role="fade"]'
    ) as HTMLElement;
    expect(fade).toBeTruthy();
    const bg = fade.style.background || fade.style.backgroundImage;
    expect(bg).toContain("linear-gradient");
    expect(bg).toContain("transparent 35%");
    expect(bg).toContain("rgba(250, 250, 250, 0.3) 70%");
    expect(bg).toContain("rgb(250, 250, 250) 100%");
  });

  it("applies 2-line WebKit clamp to every card description", () => {
    const { container } = renderOg();
    const descs = Array.from(
      container.querySelectorAll('[data-og-role="card-desc"]')
    ) as HTMLElement[];
    expect(descs).toHaveLength(6);
    for (const d of descs) {
      expect(d.style.display).toBe("-webkit-box");
      expect(d.style.webkitLineClamp).toBe("2");
      expect(d.style.webkitBoxOrient).toBe("vertical");
      expect(d.style.overflow).toBe("hidden");
    }
  });

  it("passes a fonts array covering Geist Mono, JetBrains Mono, Inter, and a Korean fallback family to ImageResponse", async () => {
    await OpenGraphImage();
    expect(capturedImageResponses).toHaveLength(1);
    const { opts } = capturedImageResponses[0];
    expect(opts.width).toBe(1200);
    expect(opts.height).toBe(630);
    const families = new Set(opts.fonts?.map((f) => f.name) ?? []);
    expect(families.has("Geist Mono")).toBe(true);
    expect(families.has("JetBrains Mono")).toBe(true);
    expect(families.has("Inter")).toBe(true);
    // any Korean-covering font (Pretendard, Noto Sans KR, etc.)
    expect(
      Array.from(families).some(
        (f) => PRETENDARD_PATTERN.test(f) || NOTO_SANS_KR_PATTERN.test(f)
      )
    ).toBe(true);
  });

  it("default export resolves without throwing", async () => {
    await expect(OpenGraphImage()).resolves.toBeDefined();
  });
});
