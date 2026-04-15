import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchViewerMock = vi.fn();
const fetchCohortsMock = vi.fn();
const fetchProjectsMock = vi.fn();

vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: (...args: unknown[]) => fetchViewerMock(...args),
}));

vi.mock("@features/cohort-filter/server", () => ({
  fetchCohorts: (...args: unknown[]) => fetchCohortsMock(...args),
}));

vi.mock("@widgets/project-grid/server", () => ({
  fetchProjects: (...args: unknown[]) => fetchProjectsMock(...args),
}));

vi.mock("@features/submit-project", () => ({
  SubmitDialog: () => null,
}));

vi.mock("@widgets/header", () => ({
  Header: () => null,
}));

vi.mock("../_components/project-board", () => ({
  ProjectBoard: () => null,
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

  it("renders the Footer landmark for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the Footer landmark for signed-in visitors", async () => {
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the Korean heading and subheading", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { default: Page } = await import("../page");
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "프로젝트 보드", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText("좋아하는 프로젝트에 응원을 보내주세요.")
    ).toBeInTheDocument();
  });
});
