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

vi.mock("@features/submit-project", () => ({
  SubmitTrigger: () => null,
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

describe("home page (/)", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset();
    fetchCohortsMock.mockReset().mockResolvedValue([]);
    fetchProjectsMock.mockReset().mockResolvedValue([]);
  });

  it("renders the project board for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("project-board-stub")).toBeInTheDocument();
  });

  it("renders the project board for signed-in visitors", async () => {
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("project-board-stub")).toBeInTheDocument();
  });

  // Header/Footer landmarks are provided by the (chrome) route group layout;
  // covered by `app/(chrome)/layout.test.tsx`. ProjectBoard internals are
  // covered by `app/(chrome)/_components/project-board.test.tsx`.
});
