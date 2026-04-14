import type { Cohort } from "@entities/cohort/index.ts";
import type { ProjectWithVoteCount } from "@entities/vote/index.ts";
import { createMockSupabaseClient } from "@shared/lib/test-utils.tsx";
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

const fetchProjectsMock =
  vi.fn<
    (options?: { cohortId?: string | null }) => Promise<ProjectWithVoteCount[]>
  >();
const fetchCohortsMock = vi.fn<() => Promise<Cohort[]>>();

vi.mock("@widgets/project-grid", async () => {
  const actual = await vi.importActual<typeof import("@widgets/project-grid")>(
    "@widgets/project-grid"
  );
  return {
    ...actual,
    fetchProjects: fetchProjectsMock,
  };
});

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

const getPublicUrl = vi.fn().mockImplementation((path: string) => ({
  data: { publicUrl: `https://cdn.example.com/${path}` },
}));

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
  storage: {
    from: vi.fn().mockReturnValue({ getPublicUrl }),
  },
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

function buildProject(
  overrides: Partial<ProjectWithVoteCount> & { id: string; title: string }
): ProjectWithVoteCount {
  return {
    user_id: "user-1",
    cohort_id: "cohort-1",
    cohort_name: "Cohort A",
    tagline: `${overrides.title} tagline`,
    project_url: "https://example.com",
    screenshot_path: `user-1/${overrides.id}.png`,
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    vote_count: 0,
    author_display_name: "Author",
    author_avatar_url: null,
    ...overrides,
  };
}

const cohorts: Cohort[] = [
  { id: "a1", name: "Cohort A", created_at: "2026-04-14T00:00:00Z" },
  { id: "b2", name: "Cohort B", created_at: "2026-04-14T00:00:00Z" },
];

async function renderPage(search: Record<string, string> = {}) {
  fetchCohortsMock.mockResolvedValue(cohorts);
  const Page = (await import("./page.tsx")).default;
  const jsx = await Page({ searchParams: Promise.resolve(search) });
  render(jsx);
}

describe("home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 5 cards in vote-count-descending order with top-3 badges", async () => {
    fetchProjectsMock.mockResolvedValue([
      buildProject({ id: "p1", title: "A", vote_count: 9 }),
      buildProject({ id: "p2", title: "B", vote_count: 7 }),
      buildProject({ id: "p3", title: "C", vote_count: 5 }),
      buildProject({ id: "p4", title: "D", vote_count: 3 }),
      buildProject({ id: "p5", title: "E", vote_count: 1 }),
    ]);

    await renderPage();

    expect(screen.getAllByTestId("project-card")).toHaveLength(5);
    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.getByText("3rd")).toBeInTheDocument();
  });

  it("omits the 3rd badge when only 2 projects exist", async () => {
    fetchProjectsMock.mockResolvedValue([
      buildProject({ id: "p1", title: "A", vote_count: 9 }),
      buildProject({ id: "p2", title: "B", vote_count: 7 }),
    ]);

    await renderPage();

    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.queryByText("3rd")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no projects", async () => {
    fetchProjectsMock.mockResolvedValue([]);

    await renderPage();

    expect(screen.getByTestId("project-grid-empty")).toBeInTheDocument();
  });

  it("passes the cohort searchParam to fetchProjects when set", async () => {
    fetchProjectsMock.mockResolvedValue([]);

    await renderPage({ cohort: "a1" });

    expect(fetchProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ cohortId: "a1" })
    );
  });

  it("passes null cohortId when no cohort searchParam is set", async () => {
    fetchProjectsMock.mockResolvedValue([]);

    await renderPage();

    expect(fetchProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ cohortId: null })
    );
  });

  it("renders the SubmitDialog trigger for signed-out visitors and skips the inline submit section", async () => {
    fetchProjectsMock.mockResolvedValue([]);
    profileSingle.mockResolvedValue({ data: null, error: null });

    await renderPage();

    const trigger = screen.getByTestId("submit-dialog-stub");
    expect(trigger).toHaveAttribute("data-authenticated", "no");
    expect(trigger).toHaveAttribute("data-cohort-id", "");
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("renders the SubmitDialog trigger for signed-in students with a cohort", async () => {
    fetchProjectsMock.mockResolvedValue([]);
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
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("renders the SubmitDialog trigger for signed-in students without a cohort", async () => {
    fetchProjectsMock.mockResolvedValue([]);
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
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
