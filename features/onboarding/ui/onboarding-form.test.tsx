import type { Cohort } from "@entities/cohort";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const completeOnboardingMock = vi.fn();
vi.mock("../api/actions.ts", () => ({
  completeOnboarding: completeOnboardingMock,
}));

const signOutMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@shared/api/supabase/client.ts", () => ({
  createClient: () => ({ auth: { signOut: signOutMock } }),
}));

const { OnboardingForm } = await import("./onboarding-form");

const COHORT_A_ID = "a1b2c3d4-5678-4abc-9def-0123456789ab";
const COHORT_B_ID = "b1b2c3d4-5678-4abc-9def-0123456789ab";
const cohorts: Cohort[] = [
  {
    id: COHORT_A_ID,
    name: "LGE-1",
    label: "LG전자 1기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
  {
    id: COHORT_B_ID,
    name: "LGE-2",
    label: "LG전자 2기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
];

async function pickCohort(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByTestId("onboarding-cohort-trigger"));
  await user.click(await screen.findByRole("option", { name }));
}

function typeDisplayName(value: string) {
  const input = screen.getByLabelText("표시명") as HTMLInputElement;
  // Use fireEvent.change so React's synthetic event onChange runs — works
  // with whitespace and with strings longer than maxLength.
  fireEvent.change(input, { target: { value } });
}

async function submit() {
  const user = userEvent.setup();
  await user.click(screen.getByTestId("onboarding-submit"));
}

describe("OnboardingForm", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    completeOnboardingMock.mockReset();
    signOutMock.mockClear();
  });

  it("renders display name input, cohort selector, continue, and sign out", () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    expect(screen.getByLabelText("표시명")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-cohort-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-submit")).toBeEnabled();
    expect(screen.getByTestId("onboarding-sign-out")).toBeEnabled();
  });

  it("renders the claude-hunt Logo and not the legacy 'Claude Hunt' text", () => {
    const { container } = render(
      <OnboardingForm cohorts={cohorts} initialNext="/" />
    );
    expect(
      screen.getByRole("link", { name: "claude-hunt 홈" })
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("Claude Hunt");
  });

  it("renders exactly one h1 with 'Set up your profile' as the page heading", () => {
    const { container } = render(
      <OnboardingForm cohorts={cohorts} initialNext="/" />
    );
    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("프로필 설정");
  });

  it("renders the subtitle describing the onboarding task", () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);
    expect(
      screen.getByText(
        "기수를 선택하고 표시명을 설정하면 프로젝트를 제출할 수 있어요."
      )
    ).toBeInTheDocument();
  });

  it("blinks the Logo cursor on /onboarding (same motion as /login)", () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);
    const cursor = screen.getByText("_");
    expect(cursor.style.animationName).toBe("logo-cursor-blink");
    expect(cursor.style.animationDuration).toBe("1s");
  });

  it("has exactly one claude-hunt Logo (single source of header truth)", () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);
    const logos = screen.getAllByRole("link", { name: "claude-hunt 홈" });
    expect(logos).toHaveLength(1);
  });

  it("renders the shared page-shell classes (unified with /login)", () => {
    const { container } = render(
      <OnboardingForm cohorts={cohorts} initialNext="/" />
    );
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    for (const cls of [
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
      "bg-zinc-50",
      "px-4",
      "py-16",
      "md:py-32",
      "dark:bg-transparent",
    ]) {
      expect(section?.className).toContain(cls);
    }
  });

  it("shows 'Display name is required' when submitting empty", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    await submit();

    expect(
      await screen.findByTestId("onboarding-display-name-error")
    ).toHaveTextContent("표시명을 입력해 주세요.");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("shows 'Display name is required' for whitespace-only input", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    typeDisplayName("   ");
    await submit();

    expect(
      await screen.findByTestId("onboarding-display-name-error")
    ).toHaveTextContent("표시명을 입력해 주세요.");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("shows the length error when display name exceeds 50 chars", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    typeDisplayName("a".repeat(51));
    await submit();

    expect(
      await screen.findByTestId("onboarding-display-name-error")
    ).toHaveTextContent("50자 이하");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("shows 'Please select a cohort' when no cohort is picked", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    typeDisplayName("Alice");
    await submit();

    expect(
      await screen.findByTestId("onboarding-cohort-error")
    ).toHaveTextContent("기수를 선택해 주세요.");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("calls completeOnboarding with trimmed inputs and redirects on success", async () => {
    completeOnboardingMock.mockResolvedValue({ ok: true });
    render(<OnboardingForm cohorts={cohorts} initialNext="/dashboard" />);

    typeDisplayName("  Alice  ");
    await pickCohort("LG전자 1기");
    await submit();

    await vi.waitFor(() => {
      expect(completeOnboardingMock).toHaveBeenCalledWith({
        displayName: "Alice",
        cohortId: COHORT_A_ID,
      });
    });
    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("surfaces server-side errors and does not redirect", async () => {
    completeOnboardingMock.mockResolvedValue({
      ok: false,
      error: "permission denied",
    });
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    typeDisplayName("Alice");
    await pickCohort("LG전자 2기");
    await submit();

    expect(
      await screen.findByTestId("onboarding-submit-error")
    ).toHaveTextContent("permission denied");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("hides cohort selector and disables submit when cohorts list is empty", () => {
    render(<OnboardingForm cohorts={[]} initialNext="/" />);

    expect(screen.getByTestId("onboarding-no-cohorts")).toBeInTheDocument();
    expect(
      screen.queryByTestId("onboarding-cohort-trigger")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("onboarding-submit")).toBeDisabled();
    expect(screen.getByLabelText("표시명")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-sign-out")).toBeEnabled();
  });

  it("signs out and redirects to /login when the sign out button is clicked", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    const user = userEvent.setup();
    await user.click(screen.getByTestId("onboarding-sign-out"));

    await vi.waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
