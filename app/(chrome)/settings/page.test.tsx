import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SETTINGS_HEADING = /^설정$/;
const WITHDRAW_LABEL = /^Withdraw$/;
const DELETE_ACCOUNT_HEADING = /^계정 삭제$/;
const DANGER_WARNING =
  /프로필, 프로젝트, 추천 기록을 영구 삭제합니다\. 되돌릴 수\s+없습니다\./;
const DANGER_ZONE_REGION = /^위험 영역$/;
const NEW_PROJECT_CTA = /새 프로젝트/;

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
const fetchCohortsMock = vi.fn();
const fetchMyProjectsMock = vi.fn();

vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: (...args: unknown[]) => fetchViewerMock(...args),
}));

vi.mock("@features/cohort-filter/server", () => ({
  fetchCohorts: (...args: unknown[]) => fetchCohortsMock(...args),
}));

vi.mock("@features/my-projects", () => ({
  fetchMyProjects: (...args: unknown[]) => fetchMyProjectsMock(...args),
  MyProjectsList: ({ projects }: { projects: { id: string }[] }) => (
    <div data-count={projects.length} data-testid="my-projects-list-stub" />
  ),
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
    cohortLabel,
    email,
    initialDisplayName,
  }: {
    cohortLabel?: string | null;
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
      {cohortLabel ? (
        <label htmlFor="cohort">
          Cohort
          <input defaultValue={cohortLabel} disabled id="cohort" />
        </label>
      ) : null}
    </div>
  ),
}));

describe("settings page", () => {
  beforeEach(() => {
    fetchViewerMock.mockReset();
    fetchCohortsMock.mockReset();
    fetchCohortsMock.mockResolvedValue([]);
    fetchMyProjectsMock.mockReset();
    fetchMyProjectsMock.mockResolvedValue([]);
    redirectMock.mockClear();
  });

  it("redirects unauthenticated visitors to /login?next=/settings", async () => {
    fetchViewerMock.mockResolvedValue(null);

    const Page = (await import("./page")).default;

    await expect(Page()).rejects.toThrow("redirect:/login?next=/settings");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/settings");
  });

  it("renders the Settings heading for signed-in users", async () => {
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
      .map((h) => h.textContent?.replace(/\s+/g, " ").trim());
    expect(sectionHeadings).toEqual([
      "프로필 정보",
      "내 프로젝트 · 0",
      "위험 영역",
    ]);
  });

  it("renders the 새 프로젝트 CTA with ?next=/settings so the submit flow returns here on save/cancel", async () => {
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

    const cta = screen.getByRole("link", { name: NEW_PROJECT_CTA });
    expect(cta).toHaveAttribute("href", "/projects/new?next=/settings");
  });

  it("passes the viewer's cohort label to the settings form", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: "cohort-2",
    });
    fetchCohortsMock.mockResolvedValue([
      { id: "cohort-1", name: "cohort-1", label: "1기" },
      { id: "cohort-2", name: "cohort-2", label: "2기" },
    ]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const cohortInput = screen.getByLabelText("Cohort") as HTMLInputElement;
    expect(cohortInput).toBeDisabled();
    expect(cohortInput.value).toBe("2기");
  });

  it("omits the cohort field when the viewer has no cohort", async () => {
    fetchViewerMock.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      avatarUrl: null,
      cohortId: null,
    });
    fetchCohortsMock.mockResolvedValue([
      { id: "cohort-1", name: "cohort-1", label: "1기" },
    ]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.queryByLabelText("Cohort")).not.toBeInTheDocument();
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
