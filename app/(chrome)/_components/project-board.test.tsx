import type { Cohort } from "@entities/cohort";
import { renderWithSearchParams } from "@shared/lib/test-utils";
import { act, screen, within } from "@testing-library/react";
import type { ProjectGridRow } from "@widgets/project-grid";
import { vi } from "vitest";

// Capture the onValueChange callback and props that ProjectBoard passes
// to CohortChips so tests can drive filtering and assert forwarded props.
let capturedOnValueChange: ((id: string | null) => void) | undefined;
let capturedChipsProps:
  | {
      allCount: number;
      counts: Record<string, number>;
      value: string | null;
    }
  | undefined;

vi.mock("@features/cohort-filter", async () => {
  const actual = await vi.importActual<
    typeof import("@features/cohort-filter")
  >("@features/cohort-filter");
  return {
    ...actual,
    CohortChips: ({
      allCount,
      counts,
      onValueChange,
      value,
    }: {
      allCount: number;
      counts: Record<string, number>;
      onValueChange: (id: string | null) => void;
      value: string | null;
    }) => {
      capturedOnValueChange = onValueChange;
      capturedChipsProps = { allCount, counts, value };
      return (
        <div
          data-all-count={allCount}
          data-testid="cohort-chips-stub"
          data-value={value ?? "__all__"}
        />
      );
    },
  };
});

vi.mock("@features/toggle-vote", () => ({
  VoteButton: ({
    alreadyVoted,
    projectId,
    voteCount,
  }: {
    alreadyVoted: boolean;
    projectId: string;
    voteCount: number;
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

vi.mock("@features/edit-project", () => ({
  EditDialog: () => null,
}));
vi.mock("@features/delete-project", () => ({
  DeleteButton: () => null,
}));
vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example.com/${path}` },
        }),
      }),
    },
  }),
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

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));

const cohorts: Cohort[] = [
  {
    id: "cohort-a",
    name: "LGE-1",
    label: "LG전자 1기",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cohort-b",
    name: "LGE-2",
    label: "LG전자 2기",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function buildProject(
  overrides: Partial<ProjectGridRow> & { id: string; title: string }
): ProjectGridRow {
  return {
    user_id: "user-1",
    cohort_id: "cohort-a",
    cohort_label: "LG전자 1기",
    cohort_name: "LGE-1",
    tagline: `${overrides.title} tagline`,
    description: null,
    project_url: "https://example.com",
    images: [{ path: `${overrides.id}.png` }],
    primary_image_path: `${overrides.id}.png`,
    github_url: null,
    screenshotUrl: `https://cdn.example.com/${overrides.id}.png`,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    vote_count: 0,
    author_display_name: "Author",
    author_avatar_url: null,
    viewer_has_voted: false,
    ...overrides,
  };
}

const projectA1 = buildProject({
  id: "pa1",
  title: "Alpha One",
  cohort_id: "cohort-a",
});
const projectA2 = buildProject({
  id: "pa2",
  title: "Alpha Two",
  cohort_id: "cohort-a",
});
const projectB1 = buildProject({
  id: "pb1",
  title: "Beta One",
  cohort_id: "cohort-b",
});
const allProjects = [projectA1, projectA2, projectB1];

async function renderBoard(
  opts: {
    initialCohortId?: string | null;
    projects?: ProjectGridRow[];
    viewerUserId?: string | null;
  } = {}
) {
  capturedOnValueChange = undefined;
  const { ProjectBoard } = await import("./project-board");
  const search = opts.initialCohortId ? `?cohort=${opts.initialCohortId}` : "";
  renderWithSearchParams(
    <ProjectBoard
      cohorts={cohorts}
      initialCohortId={opts.initialCohortId ?? null}
      isAuthenticated={false}
      projects={opts.projects ?? allProjects}
      viewerUserId={opts.viewerUserId ?? null}
    />,
    search
  );
}

describe("ProjectBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards allCount and per-cohort counts to CohortChips", async () => {
    await renderBoard();
    expect(capturedChipsProps?.allCount).toBe(3);
    expect(capturedChipsProps?.counts).toEqual({
      "cohort-a": 2,
      "cohort-b": 1,
    });
    expect(capturedChipsProps?.value).toBeNull();
  });

  it("shows all projects when no cohort is selected", async () => {
    await renderBoard();
    // Each row renders the title in both desktop and mobile branches.
    expect(screen.getAllByText("Alpha One").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Alpha Two").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta One").length).toBeGreaterThanOrEqual(1);
  });

  it("does not show English 'Filter by cohort' helper text", async () => {
    await renderBoard();
    expect(screen.queryByText("Filter by cohort")).not.toBeInTheDocument();
  });

  it("hydrates the selected cohort from the URL on initial render", async () => {
    await renderBoard({ initialCohortId: "cohort-a" });
    expect(capturedChipsProps?.value).toBe("cohort-a");
    expect(screen.getAllByText("Alpha One").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Alpha Two").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Beta One")).not.toBeInTheDocument();
  });

  it("renders the server-seeded cohort on first paint without a URL param", async () => {
    // Simulate SSR / pre-hydration: the prop carries the parsed cohort but
    // the client URL adapter has no `?cohort` yet. The grid must already be
    // filtered (no flash of the full list).
    capturedOnValueChange = undefined;
    const { ProjectBoard } = await import("./project-board");
    renderWithSearchParams(
      <ProjectBoard
        cohorts={cohorts}
        initialCohortId="cohort-a"
        isAuthenticated={false}
        projects={allProjects}
        viewerUserId={null}
      />,
      ""
    );
    expect(capturedChipsProps?.value).toBe("cohort-a");
    expect(screen.getAllByText("Alpha One").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Beta One")).not.toBeInTheDocument();
  });

  it("filters to cohort B when onValueChange is called with cohort-b", async () => {
    await renderBoard();
    await act(async () => {
      await capturedOnValueChange?.("cohort-b");
    });
    expect(screen.getAllByText("Beta One").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
  });

  it("returns to all projects when onValueChange is called with null", async () => {
    await renderBoard({ initialCohortId: "cohort-a" });
    await act(async () => {
      await capturedOnValueChange?.(null);
    });
    expect(screen.getAllByText("Alpha One").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta One").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the prompt line reflecting the current cohort label", async () => {
    await renderBoard({ initialCohortId: "cohort-a" });
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      `$ claude-hunt ls --class="LG전자 1기" --sort=votes`
    );

    await act(async () => {
      await capturedOnValueChange?.(null);
    });
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      "$ claude-hunt ls --sort=votes"
    );

    await act(async () => {
      await capturedOnValueChange?.("cohort-b");
    });
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      `$ claude-hunt ls --class="LG전자 2기" --sort=votes`
    );
  });

  it("preserves voted indicator for the correct projects per filter view", async () => {
    const votedA1 = { ...projectA1, viewer_has_voted: true };
    await renderBoard({
      projects: [votedA1, projectA2, projectB1],
      viewerUserId: "user-1",
    });

    // Cohort A — votedA1 should show voted
    await act(async () => {
      await capturedOnValueChange?.("cohort-a");
    });
    const buttons = screen.getAllByTestId("vote-button-stub");
    const votedButton = buttons.find(
      (b) => b.getAttribute("data-project-id") === "pa1"
    );
    expect(votedButton).toHaveAttribute("data-already-voted", "true");
    const unvotedButton = buttons.find(
      (b) => b.getAttribute("data-project-id") === "pa2"
    );
    expect(unvotedButton).toHaveAttribute("data-already-voted", "false");
  });

  it("preserves server-provided order after filtering to a cohort", async () => {
    // Server returns rows already sorted by vote_count desc, created_at desc.
    const high = buildProject({
      id: "s-high",
      title: "High",
      cohort_id: "cohort-a",
      vote_count: 5,
    });
    const mid = buildProject({
      id: "s-mid",
      title: "Mid",
      cohort_id: "cohort-a",
      vote_count: 3,
    });
    const betaTop = buildProject({
      id: "s-beta",
      title: "Beta Top",
      cohort_id: "cohort-b",
      vote_count: 4,
    });
    const low = buildProject({
      id: "s-low",
      title: "Low",
      cohort_id: "cohort-a",
      vote_count: 1,
    });

    await renderBoard({ projects: [high, betaTop, mid, low] });
    await act(async () => {
      await capturedOnValueChange?.("cohort-a");
    });

    const cards = screen.getAllByTestId("project-card");
    expect(cards.map((c) => c.textContent)).toEqual([
      expect.stringContaining("High"),
      expect.stringContaining("Mid"),
      expect.stringContaining("Low"),
    ]);
  });

  it("keeps the first-render row order when a revalidation delivers a re-sorted list, while counts update in place", async () => {
    const { ProjectBoard } = await import("./project-board");
    const first = buildProject({ id: "p1", title: "First", vote_count: 5 });
    const second = buildProject({ id: "p2", title: "Second", vote_count: 3 });
    const third = buildProject({ id: "p3", title: "Third", vote_count: 1 });

    const boardProps = {
      cohorts,
      initialCohortId: null,
      isAuthenticated: true,
      viewerUserId: null,
    };
    const { rerender } = renderWithSearchParams(
      <ProjectBoard {...boardProps} projects={[first, second, third]} />
    );

    // A vote pushes Third to the top on the server; the revalidated payload
    // arrives re-sorted with a fresh count.
    rerender(
      <ProjectBoard
        {...boardProps}
        projects={[
          { ...third, vote_count: 9 },
          first,
          second,
        ]}
      />
    );

    const cards = screen.getAllByTestId("project-card");
    expect(cards.map((c) => c.textContent)).toEqual([
      expect.stringContaining("First"),
      expect.stringContaining("Second"),
      expect.stringContaining("Third"),
    ]);
    const thirdVote = within(cards[2]).getAllByTestId("vote-button-stub")[0];
    expect(thirdVote).toHaveTextContent("9");
  });

  it("appends projects submitted after first render below the pinned rows", async () => {
    const { ProjectBoard } = await import("./project-board");
    const boardProps = {
      cohorts,
      initialCohortId: null,
      isAuthenticated: true,
      viewerUserId: null,
    };
    const { rerender } = renderWithSearchParams(
      <ProjectBoard {...boardProps} projects={[projectA1, projectA2]} />
    );

    // A brand-new submission tops the server ranking mid-session.
    const newcomer = buildProject({
      id: "p-new",
      title: "Newcomer",
      vote_count: 99,
    });
    rerender(
      <ProjectBoard
        {...boardProps}
        projects={[newcomer, projectA1, projectA2]}
      />
    );

    const cards = screen.getAllByTestId("project-card");
    expect(cards.map((c) => c.textContent)).toEqual([
      expect.stringContaining("Alpha One"),
      expect.stringContaining("Alpha Two"),
      expect.stringContaining("Newcomer"),
    ]);
  });
});
