import { createMockSupabaseClient } from "@shared/lib/test-utils.tsx";
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

const mockClient = createMockSupabaseClient();

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

describe("<Header />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the claude-hunt logo linking to /", async () => {
    const { Header } = await import("./header.tsx");
    const jsx = await Header();
    render(jsx);

    const logo = screen.getByRole("link", { name: LOGO_LABEL });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders a Log in button navigating to /login when signed out", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const { Header } = await import("./header.tsx");
    const jsx = await Header();
    render(jsx);

    const login = screen.getByRole("link", { name: LOGIN_LABEL });
    expect(login).toHaveAttribute("href", "/login");
  });

  it("does not render an avatar for signed-out visitors", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const { Header } = await import("./header.tsx");
    const jsx = await Header();
    render(jsx);

    expect(
      screen.queryByRole("button", { name: ACCOUNT_MENU_LABEL })
    ).not.toBeInTheDocument();
  });
});
