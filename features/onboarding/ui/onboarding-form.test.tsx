import type { Cohort } from "@entities/cohort/index.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { OnboardingForm } = await import("./onboarding-form.tsx");

const COHORT_A_ID = "a1b2c3d4-5678-4abc-9def-0123456789ab";
const COHORT_B_ID = "b1b2c3d4-5678-4abc-9def-0123456789ab";
const cohorts: Cohort[] = [
  { id: COHORT_A_ID, name: "Cohort A", created_at: "2026-04-14T00:00:00Z" },
  { id: COHORT_B_ID, name: "Cohort B", created_at: "2026-04-14T00:00:00Z" },
];

async function pickCohort(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByTestId("onboarding-cohort-trigger"));
  await user.click(await screen.findByRole("option", { name }));
}

function typeDisplayName(value: string) {
  const input = screen.getByLabelText("Display name") as HTMLInputElement;
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

    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-cohort-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-submit")).toBeEnabled();
    expect(screen.getByTestId("onboarding-sign-out")).toBeEnabled();
  });

  it("shows 'Display name is required' when submitting empty", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    await submit();

    expect(
      await screen.findByTestId("onboarding-display-name-error")
    ).toHaveTextContent("Display name is required");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("shows 'Display name is required' for whitespace-only input", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    typeDisplayName("   ");
    await submit();

    expect(
      await screen.findByTestId("onboarding-display-name-error")
    ).toHaveTextContent("Display name is required");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("shows the length error when display name exceeds 50 chars", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    typeDisplayName("a".repeat(51));
    await submit();

    expect(
      await screen.findByTestId("onboarding-display-name-error")
    ).toHaveTextContent("50 characters or fewer");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("shows 'Please select a cohort' when no cohort is picked", async () => {
    render(<OnboardingForm cohorts={cohorts} initialNext="/" />);

    typeDisplayName("Alice");
    await submit();

    expect(
      await screen.findByTestId("onboarding-cohort-error")
    ).toHaveTextContent("Please select a cohort");
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it("calls completeOnboarding with trimmed inputs and redirects on success", async () => {
    completeOnboardingMock.mockResolvedValue({ ok: true });
    render(<OnboardingForm cohorts={cohorts} initialNext="/dashboard" />);

    typeDisplayName("  Alice  ");
    await pickCohort("Cohort A");
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
    await pickCohort("Cohort B");
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
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
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
