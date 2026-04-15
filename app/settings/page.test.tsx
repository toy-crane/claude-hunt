import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BACK_HOME_LABEL = /홈으로 돌아가기/;
const SETTINGS_HEADING = /^설정$/;
const WITHDRAW_LABEL = /^Withdraw$/;
const DELETE_ACCOUNT_HEADING = /^계정 삭제$/;
const DANGER_WARNING =
  /프로필, 프로젝트, 추천 기록을 영구 삭제합니다\. 되돌릴 수 없어요\./;
const DANGER_ZONE_REGION = /^위험 영역$/;

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

    const Page = (await import("./page")).default;

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

    const Page = (await import("./page")).default;
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

  it("renders Profile and Danger Zone section headings in order", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
    });

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const sectionHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.trim());
    expect(sectionHeadings).toEqual(["프로필", "위험 영역"]);
  });

  it("renders the Delete account row with a Withdraw button and warning text in Danger Zone", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
    });

    const Page = (await import("./page")).default;
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
