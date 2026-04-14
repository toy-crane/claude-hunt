import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BACK_HOME_LABEL = /back to home/i;
const SETTINGS_HEADING = /^settings$/i;
const LOG_OUT_LABEL = /^log out$/i;
const WITHDRAW_LABEL = /^withdraw$/i;
const DELETE_ACCOUNT_HEADING = /^delete account$/i;
const DANGER_WARNING =
  /permanently remove your profile, projects, and votes\. this cannot be undone\./i;
const ACCOUNT_REGION = /^account$/i;
const DANGER_ZONE_REGION = /^danger zone$/i;

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
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
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

vi.mock("@features/withdraw-user", () => ({
  WithdrawDialog: ({ email }: { email: string }) => (
    <div data-email={email} data-testid="withdraw-dialog-stub">
      <button type="button">Withdraw</button>
    </div>
  ),
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

  it("renders the Settings heading and a Back to home link for signed-in users", async () => {
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
      screen.getByRole("heading", { level: 1, name: SETTINGS_HEADING })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: BACK_HOME_LABEL })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("renders Profile, Account, and Danger Zone section headings in order", async () => {
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

    const sectionHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.trim());
    expect(sectionHeadings).toEqual(["Profile", "Account", "Danger Zone"]);
  });

  it("renders the Log out button inside the Account section", async () => {
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

    const accountSection = screen.getByRole("region", { name: ACCOUNT_REGION });
    const logOut = within(accountSection).getByRole("button", {
      name: LOG_OUT_LABEL,
    });
    expect(logOut.closest("form")).not.toBeNull();
  });

  it("renders the Delete account row with a Withdraw button and warning text in Danger Zone", async () => {
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

    const dangerSection = screen.getByRole("region", {
      name: DANGER_ZONE_REGION,
    });
    expect(
      within(dangerSection).getByText(DELETE_ACCOUNT_HEADING)
    ).toBeInTheDocument();
    expect(within(dangerSection).getByText(DANGER_WARNING)).toBeInTheDocument();
    expect(
      within(dangerSection).getByRole("button", { name: WITHDRAW_LABEL })
    ).toBeInTheDocument();
  });
});
