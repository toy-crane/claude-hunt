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

vi.mock("../../_components/project-board", () => ({
  ProjectBoard: ({ isAuthenticated }: { isAuthenticated: boolean }) => (
    <div
      data-authenticated={isAuthenticated ? "yes" : "no"}
      data-testid="project-board-stub"
    />
  ),
}));

const SIGNED_IN_VIEWER = {
  id: "user-1",
  email: "alice@example.com",
  displayName: "Alice",
  avatarUrl: null,
  cohortId: null,
};

describe("<ProjectBoardSection />", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset();
    fetchCohortsMock.mockReset().mockResolvedValue([]);
    fetchProjectsMock.mockReset().mockResolvedValue([]);
  });

  it("renders the project board for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { ProjectBoardSection } = await import("./project-board-section");
    render(await ProjectBoardSection({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("project-board-stub")).toHaveAttribute(
      "data-authenticated",
      "no"
    );
    expect(fetchProjectsMock).toHaveBeenCalledWith({ viewerUserId: null });
  });

  it("renders the project board with the viewer overlay for signed-in visitors", async () => {
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);

    const { ProjectBoardSection } = await import("./project-board-section");
    render(await ProjectBoardSection({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("project-board-stub")).toHaveAttribute(
      "data-authenticated",
      "yes"
    );
    expect(fetchProjectsMock).toHaveBeenCalledWith({ viewerUserId: "user-1" });
  });
});
