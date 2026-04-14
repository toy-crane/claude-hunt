import { render, screen } from "@testing-library/react";
import type { ProjectGridRow } from "@widgets/project-grid/index.ts";
import { vi } from "vitest";

// Lightweight stubs for feature components that this section slots in.
vi.mock("@features/edit-project", () => ({
  EditDialog: () => null,
}));
vi.mock("@features/delete-project", () => ({
  DeleteButton: () => null,
}));
vi.mock("@features/toggle-vote", () => ({
  VoteButton: ({
    alreadyVoted,
    voteCount,
    projectId,
  }: {
    alreadyVoted: boolean;
    voteCount: number;
    projectId: string;
  }) => (
    <button
      data-already-voted={String(alreadyVoted)}
      data-project-id={projectId}
      data-testid="vote-button-stub"
      type="button"
    >
      {voteCount}
    </button>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
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

const fetchProjectsMock =
  vi.fn<(opts?: { cohortId?: string | null }) => Promise<ProjectGridRow[]>>();

vi.mock("@widgets/project-grid", async () => {
  const actual = await vi.importActual<typeof import("@widgets/project-grid")>(
    "@widgets/project-grid"
  );
  return { ...actual, fetchProjects: fetchProjectsMock };
});

const getPublicUrlMock = vi.fn().mockImplementation((path: string) => ({
  data: { publicUrl: `https://cdn.example.com/${path}` },
}));

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    storage: {
      from: vi.fn().mockReturnValue({ getPublicUrl: getPublicUrlMock }),
    },
  }),
}));

function buildProject(
  overrides: Partial<ProjectGridRow> & { id: string; title: string }
): ProjectGridRow {
  return {
    user_id: "user-1",
    cohort_id: "cohort-1",
    cohort_name: "LGE-1",
    tagline: `${overrides.title} tagline`,
    project_url: "https://example.com",
    screenshot_path: `user-1/${overrides.id}.png`,
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    vote_count: 0,
    author_display_name: "Author",
    author_avatar_url: null,
    viewer_has_voted: false,
    ...overrides,
  };
}

async function renderSection(
  opts: {
    cohortId?: string | null;
    viewerUserId?: string | null;
    isAuthenticated?: boolean;
  } = {}
) {
  const { ProjectGridSection } = await import("./project-grid-section.tsx");
  const jsx = await ProjectGridSection({
    cohortId: opts.cohortId ?? null,
    viewerUserId: opts.viewerUserId ?? null,
    isAuthenticated: opts.isAuthenticated ?? false,
  });
  render(jsx);
}

describe("ProjectGridSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a card for each returned project, sorted by vote count descending with top-3 badges", async () => {
    fetchProjectsMock.mockResolvedValue([
      buildProject({ id: "p1", title: "A", vote_count: 9 }),
      buildProject({ id: "p2", title: "B", vote_count: 7 }),
      buildProject({ id: "p3", title: "C", vote_count: 5 }),
      buildProject({ id: "p4", title: "D", vote_count: 3 }),
      buildProject({ id: "p5", title: "E", vote_count: 1 }),
    ]);

    await renderSection();

    expect(screen.getAllByTestId("project-card")).toHaveLength(5);
    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.getByText("3rd")).toBeInTheDocument();
  });

  it("renders only top-2 badges when exactly 2 projects exist", async () => {
    fetchProjectsMock.mockResolvedValue([
      buildProject({ id: "p1", title: "A", vote_count: 9 }),
      buildProject({ id: "p2", title: "B", vote_count: 7 }),
    ]);

    await renderSection();

    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.queryByText("3rd")).not.toBeInTheDocument();
  });

  it("renders the empty state when fetchProjects returns no rows", async () => {
    fetchProjectsMock.mockResolvedValue([]);

    await renderSection();

    expect(screen.getByTestId("project-grid-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("project-grid")).not.toBeInTheDocument();
  });

  it("passes cohortId to fetchProjects", async () => {
    fetchProjectsMock.mockResolvedValue([]);

    await renderSection({ cohortId: "coh-1" });

    expect(fetchProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ cohortId: "coh-1" })
    );
  });

  it("passes null cohortId to fetchProjects when none is given", async () => {
    fetchProjectsMock.mockResolvedValue([]);

    await renderSection();

    expect(fetchProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ cohortId: null })
    );
  });

  it("marks voted projects for the viewer", async () => {
    fetchProjectsMock.mockResolvedValue([
      buildProject({
        id: "p1",
        title: "Voted",
        user_id: "other",
        viewer_has_voted: true,
      }),
      buildProject({
        id: "p2",
        title: "Unvoted",
        user_id: "other",
        viewer_has_voted: false,
      }),
    ]);

    await renderSection({ viewerUserId: "viewer-1", isAuthenticated: true });

    const buttons = screen.getAllByTestId("vote-button-stub");
    expect(buttons[0]).toHaveAttribute("data-already-voted", "true");
    expect(buttons[1]).toHaveAttribute("data-already-voted", "false");
  });
});
