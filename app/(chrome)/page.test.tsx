import { render, screen } from "@testing-library/react";
import type { ProjectGridRow } from "@widgets/project-grid";
import type { FetchMonthlyTopProjectsResult } from "@widgets/winner-spotlight/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" />,
}));

// HomeContent awaits connection() to opt into request-time rendering; stub it
// so the component runs synchronously in jsdom.
vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

const fetchViewerMock = vi.fn();
const fetchProjectCountMock = vi.fn();
const fetchMonthlyTopProjectsMock =
  vi.fn<(...args: unknown[]) => Promise<FetchMonthlyTopProjectsResult>>();

function monthlyResult(
  projects: ProjectGridRow[],
  overrides?: Partial<FetchMonthlyTopProjectsResult>
): FetchMonthlyTopProjectsResult {
  return {
    monthSlug: "2026-05",
    monthLabel: "2026년 5월",
    projects,
    ...overrides,
  };
}

vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: (...args: unknown[]) => fetchViewerMock(...args),
}));

vi.mock("@widgets/header/server", () => ({
  fetchProjectCount: (...args: unknown[]) => fetchProjectCountMock(...args),
}));

vi.mock("@widgets/winner-spotlight/server", () => ({
  fetchMonthlyTopProjects: (...args: unknown[]) =>
    fetchMonthlyTopProjectsMock(...args),
}));

const MOCK_ROW: ProjectGridRow = {
  id: "p1",
  user_id: "u1",
  cohort_id: "c1",
  cohort_name: "LGE-4",
  cohort_label: "LG전자 4기",
  title: "비행기 게임",
  tagline: "AI의 역습을 막아주세요",
  description: null,
  project_url: "https://example.com/p1",
  github_url: null,
  images: [{ path: "p1.webp" }],
  primary_image_path: "p1.webp",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
  vote_count: 11,
  author_display_name: "Daniel",
  author_avatar_url: null,
  screenshotUrl: "https://cdn.example.com/p1.webp",
  viewer_has_voted: false,
};

const RUNNER_UP_A: ProjectGridRow = {
  ...MOCK_ROW,
  id: "p2",
  title: "대박",
  tagline: "오늘 운 좋게 대박날 일을 알려드립니다.",
  vote_count: 8,
  author_display_name: "Hwee",
  screenshotUrl: "https://cdn.example.com/p2.webp",
};

describe("home page (/)", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset().mockResolvedValue(null);
    fetchProjectCountMock.mockReset().mockResolvedValue(45);
    fetchMonthlyTopProjectsMock.mockReset();
  });

  it("renders the 이달의 클로드 헌트 hero heading", async () => {
    fetchMonthlyTopProjectsMock.mockResolvedValue(
      monthlyResult([MOCK_ROW, RUNNER_UP_A])
    );

    const { HomeContent } = await import("./page");
    const jsx = await HomeContent();
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "이달의 클로드 헌트", level: 1 })
    ).toBeInTheDocument();
  });

  it("renders the winner spotlight with the top project's title", async () => {
    fetchMonthlyTopProjectsMock.mockResolvedValue(monthlyResult([MOCK_ROW]));

    const { HomeContent } = await import("./page");
    const jsx = await HomeContent();
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "비행기 게임", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText("RANK 01 · 이달의 프로젝트")).toBeInTheDocument();
  });

  it("renders runner-up cards for rows 2..4", async () => {
    fetchMonthlyTopProjectsMock.mockResolvedValue(
      monthlyResult([MOCK_ROW, RUNNER_UP_A])
    );

    const { HomeContent } = await import("./page");
    const jsx = await HomeContent();
    render(jsx);

    // RunnersUpSection renders both desktop and mobile variants.
    expect(
      screen.getAllByRole("heading", { name: "대박", level: 4 }).length
    ).toBeGreaterThan(0);
  });

  it("renders the projects CTA with the total project count", async () => {
    fetchMonthlyTopProjectsMock.mockResolvedValue(monthlyResult([MOCK_ROW]));

    const { HomeContent } = await import("./page");
    const jsx = await HomeContent();
    render(jsx);

    expect(screen.getByText("전체 45개 프로젝트 둘러보기")).toBeInTheDocument();
  });

  it("falls back gracefully when no monthly projects are returned", async () => {
    fetchMonthlyTopProjectsMock.mockResolvedValue(monthlyResult([]));

    const { HomeContent } = await import("./page");
    const jsx = await HomeContent();
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "이달의 클로드 헌트", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText("전체 45개 프로젝트 둘러보기")).toBeInTheDocument();
  });

  it("passes the fallback month slug/label down to the Eyebrow", async () => {
    fetchMonthlyTopProjectsMock.mockResolvedValue(
      monthlyResult([MOCK_ROW], {
        monthSlug: "2026-04",
        monthLabel: "2026년 4월",
      })
    );

    const { HomeContent } = await import("./page");
    const jsx = await HomeContent();
    render(jsx);

    expect(
      screen.getByText("claude-hunt show --top --month=2026-04")
    ).toBeInTheDocument();
    expect(screen.getByText("2026년 4월의 1위 프로젝트")).toBeInTheDocument();
  });

  it("uses an absolute title with the brand suffix matching the projects-page convention", async () => {
    const { metadata } = await import("./page");
    expect(metadata.title).toEqual(
      expect.objectContaining({ absolute: "이달의 프로젝트 — 클로드 헌트" })
    );
  });

  it("declares a self-referencing root canonical", async () => {
    const { metadata } = await import("./page");
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("sets a unique description distinct from the layout fallback", async () => {
    const { metadata } = await import("./page");
    expect(metadata.description).toBe(
      "이번 달 1위 프로젝트와 함께 사랑받은 인기 프로젝트들을 만나보세요."
    );
  });
});
