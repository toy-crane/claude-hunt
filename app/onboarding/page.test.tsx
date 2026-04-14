import type { Cohort } from "@entities/cohort/index.ts";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const REDIRECT_LOGIN = /REDIRECT:\/login/;
const REDIRECT_ROOT = /REDIRECT:\/$/;
const REDIRECT_SOME_PAGE = /REDIRECT:\/some-page/;

const redirectMock = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const fetchCohortsMock = vi.fn<() => Promise<Cohort[]>>();
vi.mock("@features/cohort-filter", async () => {
  const actual = await vi.importActual<
    typeof import("@features/cohort-filter")
  >("@features/cohort-filter");
  return {
    ...actual,
    fetchCohorts: fetchCohortsMock,
  };
});

vi.mock("@features/onboarding", () => ({
  OnboardingForm: ({
    cohorts,
    initialNext,
  }: {
    cohorts: Cohort[];
    initialNext: string;
  }) => (
    <div
      data-cohort-count={cohorts.length}
      data-initial-next={initialNext}
      data-testid="onboarding-form-stub"
    />
  ),
}));

const getUser = vi.fn();
const profileSingle = vi.fn();

const mockClient = {
  auth: { getUser },
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

const cohorts: Cohort[] = [
  { id: "a1", name: "Cohort A", created_at: "2026-04-14T00:00:00Z" },
];

async function renderPage(search: Record<string, string> = {}) {
  const Page = (await import("./page.tsx")).default;
  const jsx = await Page({ searchParams: Promise.resolve(search) });
  render(jsx);
}

describe("/onboarding page", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getUser.mockReset();
    profileSingle.mockReset();
    fetchCohortsMock.mockReset();
  });

  it("redirects signed-out users to /login", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(renderPage()).rejects.toThrow(REDIRECT_LOGIN);
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects onboarded users (cohort_id set) to '/' when no next param", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({
      data: { cohort_id: "a1" },
      error: null,
    });

    await expect(renderPage()).rejects.toThrow(REDIRECT_ROOT);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects onboarded users to `next` when it's a local path", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({
      data: { cohort_id: "a1" },
      error: null,
    });

    await expect(renderPage({ next: "/some-page" })).rejects.toThrow(
      REDIRECT_SOME_PAGE
    );
  });

  it("sanitizes non-local `next` params to '/' for onboarded users", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({
      data: { cohort_id: "a1" },
      error: null,
    });

    await expect(renderPage({ next: "https://evil.com" })).rejects.toThrow(
      REDIRECT_ROOT
    );
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("renders the OnboardingForm for un-onboarded users", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({
      data: { cohort_id: null },
      error: null,
    });
    fetchCohortsMock.mockResolvedValue(cohorts);

    await renderPage();

    const stub = screen.getByTestId("onboarding-form-stub");
    expect(stub).toBeInTheDocument();
    expect(stub).toHaveAttribute("data-cohort-count", "1");
    expect(stub).toHaveAttribute("data-initial-next", "/");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("passes the sanitized `next` through to the form", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({
      data: { cohort_id: null },
      error: null,
    });
    fetchCohortsMock.mockResolvedValue(cohorts);

    await renderPage({ next: "/somewhere" });

    expect(screen.getByTestId("onboarding-form-stub")).toHaveAttribute(
      "data-initial-next",
      "/somewhere"
    );
  });

  it("passes cohorts=[] when the cohort catalog is empty", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    profileSingle.mockResolvedValue({
      data: { cohort_id: null },
      error: null,
    });
    fetchCohortsMock.mockResolvedValue([]);

    await renderPage();

    expect(screen.getByTestId("onboarding-form-stub")).toHaveAttribute(
      "data-cohort-count",
      "0"
    );
  });
});
