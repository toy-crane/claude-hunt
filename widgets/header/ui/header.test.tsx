import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const LOGO_LABEL = /claude-hunt home/i;
const LOGIN_LABEL = /log in/i;
const ACCOUNT_MENU_LABEL = /open account menu/i;

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

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

describe("<Header />", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset();
  });

  it("renders the claude-hunt logo linking to /", async () => {
    fetchViewerMock.mockResolvedValue(null);
    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

    const logo = screen.getByRole("link", { name: LOGO_LABEL });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders a Log in button navigating to /login when signed out", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

    const login = screen.getByRole("link", { name: LOGIN_LABEL });
    expect(login).toHaveAttribute("href", "/login");
  });

  it("does not render an avatar for signed-out visitors", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

    expect(
      screen.queryByRole("button", { name: ACCOUNT_MENU_LABEL })
    ).not.toBeInTheDocument();
  });

  it("renders the avatar menu and omits the Log in button when signed in", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
    });

    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

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

    const { Header } = await import("./header");
    const jsx = await Header();
    render(jsx);

    const fallback = screen.getByTestId("header-avatar-fallback");
    expect(fallback).toHaveTextContent("A");
  });
});
