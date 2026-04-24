import { vi } from "vitest";

const projectsSelectMock = vi.fn();
const votesSelectMock = vi.fn();

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === "projects_with_vote_count") {
        return { select: projectsSelectMock };
      }
      return { select: votesSelectMock };
    }),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example.com/${path}` },
        }),
      })),
    },
  }),
}));

const ROW_A = {
  id: "p1",
  user_id: "u1",
  cohort_id: "cohort-a",
  cohort_name: "A",
  title: "Alpha",
  tagline: "tag",
  project_url: "https://a.example.com",
  screenshot_path: "u1/p1.png",
  vote_count: 5,
  author_display_name: "Alice",
  author_avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const ROW_B = {
  ...ROW_A,
  id: "p2",
  cohort_id: "cohort-b",
  cohort_name: "B",
  title: "Beta",
  vote_count: 2,
};

describe("fetchProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all rows — no cohort filter applied", async () => {
    projectsSelectMock.mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [ROW_A, ROW_B],
          error: null,
        }),
      }),
    });
    votesSelectMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { fetchProjects } = await import("./fetch-projects");
    const rows = await fetchProjects({ viewerUserId: null });

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("p1");
    expect(rows[0].screenshotUrl).toBe("https://cdn.example.com/u1/p1.png");
    expect(rows[1].id).toBe("p2");
  });

  it("sets viewer_has_voted to true for projects the viewer voted on", async () => {
    projectsSelectMock.mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [ROW_A, ROW_B],
          error: null,
        }),
      }),
    });
    votesSelectMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ project_id: "p1" }],
        error: null,
      }),
    });

    const { fetchProjects } = await import("./fetch-projects");
    const rows = await fetchProjects({ viewerUserId: "u1" });

    expect(rows[0].viewer_has_voted).toBe(true);
    expect(rows[1].viewer_has_voted).toBe(false);
  });

  it("sets all viewer_has_voted to false for anonymous visitors", async () => {
    projectsSelectMock.mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [ROW_A, ROW_B],
          error: null,
        }),
      }),
    });

    const { fetchProjects } = await import("./fetch-projects");
    const rows = await fetchProjects();

    expect(rows.every((r) => r.viewer_has_voted === false)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// fetchTopProjects: cookie-free variant used by the OG image. Uses the anon
// server client and returns a narrow row shape — no viewer-vote merging.
// ──────────────────────────────────────────────────────────────────────────

const topProjectsSelectMock = vi.fn();
const topStorageFromMock = vi.fn(() => ({
  getPublicUrl: (path: string) => ({
    data: { publicUrl: `https://cdn.example.com/${path}` },
  }),
}));

vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: () => ({
    from: (table: string) => {
      if (table === "projects_with_vote_count") {
        return { select: topProjectsSelectMock };
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: { from: topStorageFromMock },
  }),
}));

describe("fetchTopProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    topStorageFromMock.mockImplementation(() => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://cdn.example.com/${path}` },
      }),
    }));
  });

  it("orders by vote_count desc, then created_at desc, then limits by the given count", async () => {
    const limitSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    const innerOrderSpy = vi.fn().mockReturnValue({ limit: limitSpy });
    const outerOrderSpy = vi.fn().mockReturnValue({ order: innerOrderSpy });
    topProjectsSelectMock.mockReturnValue({ order: outerOrderSpy });

    const { fetchTopProjects } = await import("./fetch-projects");
    await fetchTopProjects({ limit: 6 });

    expect(outerOrderSpy).toHaveBeenCalledWith("vote_count", {
      ascending: false,
    });
    expect(innerOrderSpy).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(limitSpy).toHaveBeenCalledWith(6);
  });

  it("resolves each row's screenshot_path to a public URL", async () => {
    topProjectsSelectMock.mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [ROW_A, ROW_B],
            error: null,
          }),
        }),
      }),
    });

    const { fetchTopProjects } = await import("./fetch-projects");
    const rows = await fetchTopProjects({ limit: 6 });

    expect(rows).toHaveLength(2);
    expect(rows[0].screenshotUrl).toBe("https://cdn.example.com/u1/p1.png");
    expect(rows[1].screenshotUrl).toBe("https://cdn.example.com/u1/p1.png");
    expect(topStorageFromMock).toHaveBeenCalledWith("project-screenshots");
  });

  it("returns an empty string for rows with a null screenshot_path", async () => {
    topProjectsSelectMock.mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ ...ROW_A, screenshot_path: null }],
            error: null,
          }),
        }),
      }),
    });

    const { fetchTopProjects } = await import("./fetch-projects");
    const rows = await fetchTopProjects({ limit: 6 });
    expect(rows[0].screenshotUrl).toBe("");
  });

  it("returns an empty array when the query returns no rows (does not throw)", async () => {
    topProjectsSelectMock.mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { fetchTopProjects } = await import("./fetch-projects");
    const rows = await fetchTopProjects({ limit: 6 });
    expect(rows).toEqual([]);
  });

  it("defaults the limit to 6 when no argument is provided", async () => {
    const limitSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    topProjectsSelectMock.mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ limit: limitSpy }),
      }),
    });

    const { fetchTopProjects } = await import("./fetch-projects");
    await fetchTopProjects();
    expect(limitSpy).toHaveBeenCalledWith(6);
  });
});
