import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { createMockSupabaseClient } from "@/__tests__/helpers.tsx";

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

vi.mock("@/lib/supabase/server.ts", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("@/app/auth/actions.ts", () => ({
  signOut: vi.fn(),
}));

describe("home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("HOME-001: unauthenticated user sees Sign in button linking to /login", async () => {
    mockClient.auth.getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null });

    const Page = (await import("@/app/page.tsx")).default;
    const jsx = await Page();
    render(jsx);

    const signInLink = screen.getByRole("link", { name: "Sign in" });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/login");
  });

  it("HOME-002: authenticated user sees email, provider, and Sign out button", async () => {
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          email: "user@example.com",
          app_metadata: { provider: "github" },
        },
      },
      error: null,
    });

    const Page = (await import("@/app/page.tsx")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Signed in as")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("via github")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" })
    ).toBeInTheDocument();
  });
});
