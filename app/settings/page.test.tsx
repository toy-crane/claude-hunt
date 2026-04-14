import { createMockSupabaseClient } from "@shared/lib/test-utils.tsx";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BACK_HOME_LABEL = /back to home/i;
const SETTINGS_HEADING = /^settings$/i;

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

const redirectMock = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const profileSingle = vi.fn().mockResolvedValue({ data: null, error: null });

const mockClient = {
  ...createMockSupabaseClient(),
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: profileSingle,
      }),
    }),
  }),
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

describe("settings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors to /login?next=/settings", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const Page = (await import("./page.tsx")).default;

    await expect(Page()).rejects.toThrow("redirect:/login?next=/settings");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings");
  });

  it("renders the heading, display name, email, and back-to-home link for signed-in users", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "alice@example.com" } },
      error: null,
    });
    profileSingle.mockResolvedValueOnce({
      data: { display_name: "Alice", email: "alice@example.com" },
      error: null,
    });

    const Page = (await import("./page.tsx")).default;
    const jsx = await Page();
    render(jsx);

    expect(
      screen.getByRole("heading", { name: SETTINGS_HEADING })
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText("Display name") as HTMLInputElement).value
    ).toBe("Alice");
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    expect(email.value).toBe("alice@example.com");
    expect(email).toBeDisabled();
    expect(screen.getByRole("link", { name: BACK_HOME_LABEL })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
