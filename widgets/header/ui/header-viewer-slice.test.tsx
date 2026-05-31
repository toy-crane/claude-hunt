import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const LOGIN_LABEL = /로그인/;
const ACCOUNT_MENU_LABEL = /계정 메뉴 열기/;

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

const fetchViewerMock = vi.fn();

vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: (...args: unknown[]) => fetchViewerMock(...args),
}));

vi.mock("@features/auth-login", () => ({
  signOut: vi.fn(),
}));

vi.mock("@features/submit-project", () => ({
  SubmitTrigger: ({ isAuthenticated }: { isAuthenticated: boolean }) => (
    <div
      data-authenticated={isAuthenticated ? "yes" : "no"}
      data-testid="submit-trigger-stub"
    >
      Submit a project
    </div>
  ),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

describe("<HeaderViewerSlice />", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset();
  });

  it("renders a Log in button navigating to /login when signed out", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { HeaderViewerSlice } = await import("./header-viewer-slice");
    render(await HeaderViewerSlice());

    const login = screen.getByRole("link", { name: LOGIN_LABEL });
    expect(login).toHaveAttribute("href", "/login");
  });

  it("does not render an avatar for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { HeaderViewerSlice } = await import("./header-viewer-slice");
    render(await HeaderViewerSlice());

    expect(
      screen.queryByRole("button", { name: ACCOUNT_MENU_LABEL })
    ).not.toBeInTheDocument();
  });

  it("passes isAuthenticated=false to the submit trigger when signed out", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { HeaderViewerSlice } = await import("./header-viewer-slice");
    render(await HeaderViewerSlice());

    expect(screen.getByTestId("submit-trigger-stub")).toHaveAttribute(
      "data-authenticated",
      "no"
    );
  });

  it("renders the avatar menu and omits the Log in button when signed in", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
    });

    const { HeaderViewerSlice } = await import("./header-viewer-slice");
    render(await HeaderViewerSlice());

    expect(
      screen.getByRole("button", { name: ACCOUNT_MENU_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: LOGIN_LABEL })
    ).not.toBeInTheDocument();
  });

  it("shows the first character of the display name inside the avatar fallback", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
    });

    const { HeaderViewerSlice } = await import("./header-viewer-slice");
    render(await HeaderViewerSlice());

    const fallback = screen.getByTestId("header-avatar-fallback");
    expect(fallback).toHaveTextContent("A");
  });
});
