import type { Cohort } from "@entities/cohort";
import { createMockSupabaseClient } from "@shared/lib/test-utils";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// ProjectGridSection is an async RSC; mock it so the page unit test
// stays synchronous and doesn't require a real Supabase connection.
const sectionMock = vi.fn(
  (_props: {
    cohortId: string | null;
    viewerUserId: string | null;
    isAuthenticated: boolean;
  }) => <div data-testid="project-grid-section-stub" />
);
vi.mock("./_components/project-grid-section.tsx", () => ({
  ProjectGridSection: (props: {
    cohortId: string | null;
    viewerUserId: string | null;
    isAuthenticated: boolean;
  }) => sectionMock(props),
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

vi.mock("@features/submit-project", () => ({
  SubmitDialog: ({
    cohortId,
    isAuthenticated,
  }: {
    cohortId: string | null;
    isAuthenticated: boolean;
  }) => (
    <div
      data-authenticated={isAuthenticated ? "yes" : "no"}
      data-cohort-id={cohortId ?? ""}
      data-testid="submit-dialog-stub"
    >
      Submit a project
    </div>
  ),
}));

vi.mock("@widgets/header", () => ({
  Header: () => <div data-testid="site-header-stub" />,
}));

// Skeleton: rendered as a Suspense fallback — stub it so the unit test
// doesn't need any CSS / animation infrastructure.
vi.mock("@widgets/project-grid", async () => {
  const actual = await vi.importActual<typeof import("@widgets/project-grid")>(
    "@widgets/project-grid"
  );
  return {
    ...actual,
    ProjectGridSkeleton: () => <div data-testid="project-grid-skeleton-stub" />,
  };
});

const profileSingle = vi
  .fn()
  .mockResolvedValue({ data: { cohort_id: null }, error: null });

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

const cohorts: Cohort[] = [
  {
    id: "a1",
    name: "LGE-1",
    label: "LG전자 1기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
  {
    id: "b2",
    name: "LGE-2",
    label: "LG전자 2기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
];

async function renderPage(search: Record<string, string> = {}) {
  fetchCohortsMock.mockResolvedValue(cohorts);
  const Page = (await import("./page")).default;
  const jsx = await Page({ searchParams: Promise.resolve(search) });
  render(jsx);
}

describe("home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the cohort searchParam to ProjectGridSection as cohortId", async () => {
    await renderPage({ cohort: "a1" });
    expect(sectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ cohortId: "a1" })
    );
  });

  it("passes null cohortId to ProjectGridSection when no cohort param is set", async () => {
    await renderPage();
    expect(sectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ cohortId: null })
    );
  });

  it("renders the SubmitDialog trigger for signed-out visitors", async () => {
    profileSingle.mockResolvedValue({ data: null, error: null });

    await renderPage();

    const trigger = screen.getByTestId("submit-dialog-stub");
    expect(trigger).toHaveAttribute("data-authenticated", "no");
    expect(trigger).toHaveAttribute("data-cohort-id", "");
  });

  it("renders the SubmitDialog trigger for signed-in students with a cohort", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    profileSingle.mockResolvedValue({
      data: { cohort_id: "cohort-1" },
      error: null,
    });

    await renderPage();

    const trigger = screen.getByTestId("submit-dialog-stub");
    expect(trigger).toHaveAttribute("data-authenticated", "yes");
    expect(trigger).toHaveAttribute("data-cohort-id", "cohort-1");
  });

  it("renders the SubmitDialog trigger for signed-in students without a cohort", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-2" } },
      error: null,
    });
    profileSingle.mockResolvedValue({
      data: { cohort_id: null },
      error: null,
    });

    await renderPage();

    const trigger = screen.getByTestId("submit-dialog-stub");
    expect(trigger).toHaveAttribute("data-authenticated", "yes");
    expect(trigger).toHaveAttribute("data-cohort-id", "");
  });
});
