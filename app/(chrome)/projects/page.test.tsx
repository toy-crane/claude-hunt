import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchViewerMock = vi.fn();
const fetchCohortsMock = vi.fn();
const fetchProjectsMock = vi.fn();

vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: (...args: unknown[]) => fetchViewerMock(...args),
}));

vi.mock("@features/cohort-filter/server", async () => {
  const { parseAsString } = await import("nuqs/server");
  const cohortParser = parseAsString;
  return {
    fetchCohorts: (...args: unknown[]) => fetchCohortsMock(...args),
    cohortParser,
    cohortSearchParams: { cohort: cohortParser },
  };
});

vi.mock("@widgets/project-grid/server", () => ({
  fetchProjects: (...args: unknown[]) => fetchProjectsMock(...args),
}));

vi.mock("../_components/project-board", () => ({
  ProjectBoard: () => <div data-testid="project-board-stub" />,
}));

const SIGNED_IN_VIEWER = {
  id: "user-1",
  email: "alice@example.com",
  displayName: "Alice",
  avatarUrl: null,
  cohortId: null,
};

describe("/projects page", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset();
    fetchCohortsMock.mockReset().mockResolvedValue([]);
    fetchProjectsMock.mockReset().mockResolvedValue([]);
  });

  it("renders the project board for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { default: Page } = await import("./page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("project-board-stub")).toBeInTheDocument();
  });

  it("renders the project board for signed-in visitors", async () => {
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);

    const { default: Page } = await import("./page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("project-board-stub")).toBeInTheDocument();
  });

  it("uses 프로젝트 보드 as the page heading", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { default: Page } = await import("./page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "프로젝트 보드", level: 1 })
    ).toBeInTheDocument();
  });

  it("declares a self-referencing /projects canonical", async () => {
    const { metadata } = await import("./page");
    expect(metadata.alternates?.canonical).toBe("/projects");
  });

  it("exports an absolute title carrying the 클로드 헌트 brand", async () => {
    const { metadata } = await import("./page");
    expect(metadata.title).toEqual(
      expect.objectContaining({
        absolute: expect.stringContaining("클로드 헌트"),
      })
    );
  });
});
