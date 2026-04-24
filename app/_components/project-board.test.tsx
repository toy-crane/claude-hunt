import type { Cohort } from "@entities/cohort";
import { act, render, screen } from "@testing-library/react";
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

vi.mock("@features/cohort-filter", () => ({
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
}));

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
vi.mock("@features/submit-project", () => ({
  SubmitDialog: ({
    cohortId,
    isAuthenticated,
  }: {
    cohortId: string | null;
    isAuthenticated: boolean;
  }) => (
    <button
      data-authenticated={String(isAuthenticated)}
      data-cohort-id={cohortId ?? ""}
      data-testid="submit-dialog-stub"
      type="button"
    >
      프로젝트 제출
    </button>
  ),
}));

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
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

type ProjectBoardRow = ProjectGridRow & { screenshotUrl: string };

function buildProject(
  overrides: Partial<ProjectBoardRow> & { id: string; title: string }
): ProjectBoardRow {
  return {
    user_id: "user-1",
    cohort_id: "cohort-a",
    cohort_name: "LGE-1",
    tagline: `${overrides.title} tagline`,
    project_url: "https://example.com",
    screenshot_path: `${overrides.id}.png`,
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
    projects?: ProjectBoardRow[];
    viewerUserId?: string | null;
  } = {}
) {
  capturedOnValueChange = undefined;
  const { ProjectBoard } = await import("./project-board");
  render(
    <ProjectBoard
      cohorts={cohorts}
      initialCohortId={opts.initialCohortId ?? null}
      isAuthenticated={false}
      projects={opts.projects ?? allProjects}
      viewerUserId={opts.viewerUserId ?? null}
    />
  );
}

describe("ProjectBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window.history, "replaceState").mockImplementation(vi.fn());
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

  it("renders the Korean H1 and the subtitle with the filtered project count", async () => {
    await renderBoard();
    expect(
      screen.getByRole("heading", { name: "프로젝트 보드", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByTestId("project-board-subtitle")).toHaveTextContent(
      "3개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요."
    );

    act(() => capturedOnValueChange?.("cohort-a"));
    expect(screen.getByTestId("project-board-subtitle")).toHaveTextContent(
      "2개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요."
    );

    act(() => capturedOnValueChange?.("cohort-b"));
    expect(screen.getByTestId("project-board-subtitle")).toHaveTextContent(
      "1개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요."
    );
  });

  it("forwards viewerCohortId + isAuthenticated to the inline SubmitDialog trigger", async () => {
    capturedOnValueChange = undefined;
    const { ProjectBoard } = await import("./project-board");
    render(
      <ProjectBoard
        cohorts={cohorts}
        initialCohortId={null}
        isAuthenticated={true}
        projects={allProjects}
        viewerCohortId="cohort-a"
        viewerUserId="user-1"
      />
    );
    const submit = screen.getByTestId("submit-dialog-stub");
    expect(submit).toHaveAttribute("data-authenticated", "true");
    expect(submit).toHaveAttribute("data-cohort-id", "cohort-a");
  });

  it("shows all projects when no cohort is selected", async () => {
    await renderBoard();
    expect(screen.getByText("Alpha One")).toBeInTheDocument();
    expect(screen.getByText("Alpha Two")).toBeInTheDocument();
    expect(screen.getByText("Beta One")).toBeInTheDocument();
  });

  it("does not show English 'Filter by cohort' helper text", async () => {
    await renderBoard();
    expect(screen.queryByText("Filter by cohort")).not.toBeInTheDocument();
  });

  it("shows only the selected cohort's projects on initial render", async () => {
    await renderBoard({ initialCohortId: "cohort-a" });
    expect(screen.getByText("Alpha One")).toBeInTheDocument();
    expect(screen.getByText("Alpha Two")).toBeInTheDocument();
    expect(screen.queryByText("Beta One")).not.toBeInTheDocument();
  });

  it("filters to cohort B when onValueChange is called with cohort-b", async () => {
    await renderBoard();
    act(() => capturedOnValueChange?.("cohort-b"));
    expect(screen.getByText("Beta One")).toBeInTheDocument();
    expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
  });

  it("returns to all projects when onValueChange is called with null", async () => {
    await renderBoard({ initialCohortId: "cohort-a" });
    act(() => capturedOnValueChange?.(null));
    expect(screen.getByText("Alpha One")).toBeInTheDocument();
    expect(screen.getByText("Beta One")).toBeInTheDocument();
  });

  it("calls history.replaceState with ?cohort=<id> when a cohort is selected", async () => {
    await renderBoard();
    act(() => capturedOnValueChange?.("cohort-a"));
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/?cohort=cohort-a"
    );
  });

  it("renders the prompt line reflecting the current cohort label", async () => {
    await renderBoard({ initialCohortId: "cohort-a" });
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      `$ claude-hunt ls --class="LG전자 1기" --sort=votes`
    );

    act(() => capturedOnValueChange?.(null));
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      "$ claude-hunt ls --sort=votes"
    );

    act(() => capturedOnValueChange?.("cohort-b"));
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      `$ claude-hunt ls --class="LG전자 2기" --sort=votes`
    );
  });

  it("calls history.replaceState without cohort param when null is selected", async () => {
    await renderBoard({ initialCohortId: "cohort-a" });
    act(() => capturedOnValueChange?.(null));
    expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "/");
  });

  it("preserves voted indicator for the correct projects per filter view", async () => {
    const votedA1 = { ...projectA1, viewer_has_voted: true };
    await renderBoard({
      projects: [votedA1, projectA2, projectB1],
      viewerUserId: "user-1",
    });

    // Cohort A — votedA1 should show voted
    act(() => capturedOnValueChange?.("cohort-a"));
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
    act(() => capturedOnValueChange?.("cohort-a"));

    const cards = screen.getAllByTestId("project-card");
    expect(cards.map((c) => c.textContent)).toEqual([
      expect.stringContaining("High"),
      expect.stringContaining("Mid"),
      expect.stringContaining("Low"),
    ]);
  });
});
