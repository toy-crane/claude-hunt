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

const fetchProjectsMock = vi.fn<() => Promise<ProjectWithVoteCount[]>>();

vi.mock("@widgets/project-grid", async () => {
  const actual = await vi.importActual<typeof import("@widgets/project-grid")>(
    "@widgets/project-grid"
  );
  return {
    ...actual,
    fetchProjects: fetchProjectsMock,
  };
});

const getPublicUrl = vi.fn().mockImplementation((path: string) => ({
  data: { publicUrl: `https://cdn.example.com/${path}` },
}));

const mockClient = {
  ...createMockSupabaseClient(),
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

    const Page = (await import("./page.tsx")).default;
    const jsx = await Page();
    render(jsx);

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

    const Page = (await import("./page.tsx")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.queryByText("3rd")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no projects", async () => {
    fetchProjectsMock.mockResolvedValue([]);

    const Page = (await import("./page.tsx")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("project-grid-empty")).toBeInTheDocument();
  });
});
