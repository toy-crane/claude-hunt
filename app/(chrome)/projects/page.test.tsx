import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchViewerMock = vi.fn();
const fetchCohortsMock = vi.fn();
const fetchProjectsMock = vi.fn();
const fetchEmailMarketingConsentStateMock = vi.fn();
const captureExceptionMock = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

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

vi.mock("@entities/email-marketing-consent/server", () => ({
  fetchEmailMarketingConsentState: (...args: unknown[]) =>
    fetchEmailMarketingConsentStateMock(...args),
}));

vi.mock("@features/email-marketing-consent", () => ({
  EmailMarketingNotice: () => <aside data-testid="email-marketing-notice" />,
}));

vi.mock("../_components/project-board", () => ({
  ProjectBoard: () => <div data-testid="project-board-stub" />,
}));

vi.mock("@core/providers/nuqs-provider", () => ({
  NuqsProvider: ({ children }: { children: React.ReactNode }) => children,
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
    fetchEmailMarketingConsentStateMock.mockReset().mockResolvedValue({
      hasDecision: false,
      isOptedIn: false,
      noticeDismissed: false,
    });
    captureExceptionMock.mockReset();
  });

  it("renders the project board for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { BoardData } = await import("./page");
    const jsx = await BoardData({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("project-board-stub")).toBeInTheDocument();
  });

  it("renders the project board for signed-in visitors", async () => {
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);

    const { BoardData } = await import("./page");
    const jsx = await BoardData({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("project-board-stub")).toBeInTheDocument();
  });

  it("shows the one-time prompt only to signed-in members without a decision", async () => {
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);

    const { BoardData } = await import("./page");
    render(await BoardData({ searchParams: Promise.resolve({}) }));

    expect(fetchEmailMarketingConsentStateMock).toHaveBeenCalledWith("user-1");
    expect(screen.getByTestId("email-marketing-notice")).toBeInTheDocument();
  });

  it("does not query or show the prompt for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { BoardData } = await import("./page");
    render(await BoardData({ searchParams: Promise.resolve({}) }));

    expect(fetchEmailMarketingConsentStateMock).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId("email-marketing-notice")
    ).not.toBeInTheDocument();
  });

  it("keeps the project board available when the optional consent lookup fails", async () => {
    const lookupError = new Error("schema cache unavailable");
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);
    fetchEmailMarketingConsentStateMock.mockRejectedValue(lookupError);

    const { BoardData } = await import("./page");
    render(await BoardData({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("project-board-stub")).toBeInTheDocument();
    expect(screen.queryByTestId("email-marketing-notice")).toBeNull();
    expect(captureExceptionMock).toHaveBeenCalledWith(lookupError);
  });

  it.each([
    {
      label: "already decided",
      state: { hasDecision: true, isOptedIn: false, noticeDismissed: false },
    },
    {
      label: "already dismissed",
      state: { hasDecision: false, isOptedIn: false, noticeDismissed: true },
    },
  ])("does not show the prompt when $label", async ({ state }) => {
    fetchViewerMock.mockResolvedValue(SIGNED_IN_VIEWER);
    fetchEmailMarketingConsentStateMock.mockResolvedValue(state);

    const { BoardData } = await import("./page");
    render(await BoardData({ searchParams: Promise.resolve({}) }));

    expect(
      screen.queryByTestId("email-marketing-notice")
    ).not.toBeInTheDocument();
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
