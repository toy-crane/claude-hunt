import type { Cohort } from "@entities/cohort";
import { createMockSupabaseClient } from "@shared/lib/test-utils";
import { render } from "@testing-library/react";
import type { ProjectGridRow } from "@widgets/project-grid";
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

// ProjectBoard is a client component; stub it so we can assert the props
// passed from the server page without rendering the grid tree.
interface BoardProps {
  cohorts: Cohort[];
  initialCohortId: string | null;
  isAuthenticated: boolean;
  projects: unknown[];
  viewerCohortId: string | null;
  viewerUserId: string | null;
}
const boardMock = vi.fn((_props: BoardProps) => (
  <div data-testid="project-board-stub" />
));
vi.mock("./_components/project-board", () => ({
  ProjectBoard: (props: BoardProps) => boardMock(props),
}));

const fetchCohortsMock = vi.fn<() => Promise<Cohort[]>>();

vi.mock("@features/cohort-filter/server", () => ({
  fetchCohorts: fetchCohortsMock,
}));

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

const fetchProjectsMock = vi.fn<() => Promise<ProjectGridRow[]>>();

vi.mock("@widgets/project-grid/server", () => ({
  fetchProjects: fetchProjectsMock,
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
    from: vi.fn().mockReturnValue({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://cdn.example.com/${path}` },
      }),
    }),
  },
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
  fetchProjectsMock.mockResolvedValue([]);
  const Page = (await import("./page")).default;
  const jsx = await Page({ searchParams: Promise.resolve(search) });
  render(jsx);
}

describe("home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the cohort searchParam to ProjectBoard as initialCohortId", async () => {
    await renderPage({ cohort: "a1" });
    expect(boardMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialCohortId: "a1" })
    );
  });

  it("passes null initialCohortId to ProjectBoard when no cohort param is set", async () => {
    await renderPage();
    expect(boardMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialCohortId: null })
    );
  });

  it("fetches projects once without a cohort filter on the server", async () => {
    await renderPage({ cohort: "a1" });
    expect(fetchProjectsMock).toHaveBeenCalledTimes(1);
    expect(fetchProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ viewerUserId: null })
    );
    // Server must NOT narrow the query by cohort — the client filters.
    expect(fetchProjectsMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ cohortId: expect.anything() })
    );
  });

  it("passes isAuthenticated=false and viewerCohortId=null to ProjectBoard for signed-out visitors", async () => {
    profileSingle.mockResolvedValue({ data: null, error: null });

    await renderPage();

    expect(boardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isAuthenticated: false,
        viewerCohortId: null,
      })
    );
  });

  it("passes isAuthenticated=true and the viewer's cohortId for signed-in students with a cohort", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    profileSingle.mockResolvedValue({
      data: { cohort_id: "cohort-1" },
      error: null,
    });

    await renderPage();

    expect(boardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isAuthenticated: true,
        viewerCohortId: "cohort-1",
      })
    );
  });

  it("passes isAuthenticated=true and viewerCohortId=null for signed-in students without a cohort", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-2" } },
      error: null,
    });
    profileSingle.mockResolvedValue({
      data: { cohort_id: null },
      error: null,
    });

    await renderPage();

    expect(boardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isAuthenticated: true,
        viewerCohortId: null,
      })
    );
  });
});
