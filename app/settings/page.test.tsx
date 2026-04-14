import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BACK_HOME_LABEL = /back to home/i;
const SETTINGS_HEADING = /^settings$/i;
const LOG_OUT_LABEL = /^log out$/i;

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
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const fetchViewerMock = vi.fn();

vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: (...args: unknown[]) => fetchViewerMock(...args),
}));

vi.mock("@features/auth-login", () => ({
  signOut: vi.fn(),
}));

vi.mock("@features/settings", () => ({
  SettingsForm: ({
    email,
    initialDisplayName,
  }: {
    email: string;
    initialDisplayName: string;
  }) => (
    <div data-testid="settings-form-stub">
      <label htmlFor="display-name">
        Display name
        <input defaultValue={initialDisplayName} id="display-name" />
      </label>
      <label htmlFor="email">
        Email
        <input defaultValue={email} disabled id="email" type="email" />
      </label>
    </div>
  ),
}));

describe("settings page", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated visitors to /login?next=/settings", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const Page = (await import("./page.tsx")).default;

    await expect(Page()).rejects.toThrow("redirect:/login?next=/settings");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings");
  });

  it("renders the heading, display name, email, and back-to-home link for signed-in users", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
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

  it("renders a Log out button submitting the signOut server action", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
    });

    const Page = (await import("./page.tsx")).default;
    const jsx = await Page();
    render(jsx);

    const button = screen.getByRole("button", { name: LOG_OUT_LABEL });
    expect(button).toBeInTheDocument();
    expect(button.closest("form")).not.toBeNull();
  });
});
