import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Captures every `.from("projects_with_vote_count")` call so we can branch on
// shape: the monthly hero query (uses `.gte/.lt/.order/.order/.limit`) vs the
// "latest created_at" probe (uses `.order/.limit/.maybeSingle`).
const monthlyQueryMock = vi.fn();
const latestCreatedAtMock = vi.fn();
const votesSelectMock = vi.fn();

function projectsViewBuilder() {
  return {
    select: (_columns: string) => ({
      // Monthly hero query: gte → lt → order → order → limit
      gte: (_col: string, _start: string) => ({
        lt: (_col2: string, _end: string) => ({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: monthlyQueryMock,
            }),
          }),
        }),
      }),
      // Latest-created_at probe: order → limit → maybeSingle
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: latestCreatedAtMock,
        }),
      }),
    }),
  };
}

vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: () => ({
    from: (table: string) => {
      if (table === "projects_with_vote_count") {
        return projectsViewBuilder();
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example.com/${path}` },
        }),
      }),
    },
  }),
}));

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => {
      if (table === "votes") {
        return { select: votesSelectMock };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const MAY_ROW = {
  id: "p-may",
  user_id: "u1",
  cohort_id: "cohort-a",
  cohort_name: "A",
  title: "May winner",
  tagline: "May tag",
  project_url: "https://may.example.com",
  primary_image_path: "u1/p-may.png",
  vote_count: 12,
  author_display_name: "Alice",
  author_avatar_url: null,
  created_at: "2026-05-20T03:00:00Z",
  updated_at: "2026-05-20T03:00:00Z",
};

const JUNE_ROW = {
  ...MAY_ROW,
  id: "p-june",
  title: "June winner",
  primary_image_path: "u1/p-june.png",
  created_at: "2026-06-05T03:00:00Z",
  updated_at: "2026-06-05T03:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  votesSelectMock.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchMonthlyTopProjects — current month populated", () => {
  it("returns the current month's projects with current-month labels", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00Z"));

    monthlyQueryMock.mockResolvedValue({ data: [JUNE_ROW], error: null });

    const { fetchMonthlyTopProjects } = await import(
      "./fetch-monthly-top-projects"
    );
    const result = await fetchMonthlyTopProjects({ limit: 4 });

    expect(result.monthSlug).toBe("2026-06");
    expect(result.monthLabel).toBe("2026년 6월");
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe("p-june");
    expect(result.projects[0].screenshotUrl).toBe(
      "https://cdn.example.com/u1/p-june.png"
    );
    // Latest-created_at probe must NOT be called when the current month
    // already has projects.
    expect(latestCreatedAtMock).not.toHaveBeenCalled();
  });
});

describe("fetchMonthlyTopProjects — current month empty, previous month has projects", () => {
  it("falls back to the month of the most recent project with that month's labels", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00Z"));

    // First call: current (June) returns empty.
    // Second call: fallback (May) returns the May row.
    monthlyQueryMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [MAY_ROW], error: null });

    latestCreatedAtMock.mockResolvedValue({
      data: { created_at: "2026-05-20T03:00:00Z" },
      error: null,
    });

    const { fetchMonthlyTopProjects } = await import(
      "./fetch-monthly-top-projects"
    );
    const result = await fetchMonthlyTopProjects({ limit: 4 });

    expect(result.monthSlug).toBe("2026-05");
    expect(result.monthLabel).toBe("2026년 5월");
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe("p-may");
    expect(monthlyQueryMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchMonthlyTopProjects — table has no projects at all", () => {
  it("returns empty projects with current-month labels", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00Z"));

    monthlyQueryMock.mockResolvedValue({ data: [], error: null });
    latestCreatedAtMock.mockResolvedValue({ data: null, error: null });

    const { fetchMonthlyTopProjects } = await import(
      "./fetch-monthly-top-projects"
    );
    const result = await fetchMonthlyTopProjects({ limit: 4 });

    expect(result.projects).toEqual([]);
    expect(result.monthSlug).toBe("2026-06");
    expect(result.monthLabel).toBe("2026년 6월");
  });
});

describe("fetchMonthlyTopProjects — viewer votes", () => {
  it("flags rows the viewer has voted on, in either current or fallback month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00Z"));

    monthlyQueryMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [MAY_ROW], error: null });
    latestCreatedAtMock.mockResolvedValue({
      data: { created_at: "2026-05-20T03:00:00Z" },
      error: null,
    });
    votesSelectMock.mockReturnValue({
      eq: vi
        .fn()
        .mockResolvedValue({ data: [{ project_id: "p-may" }], error: null }),
    });

    const { fetchMonthlyTopProjects } = await import(
      "./fetch-monthly-top-projects"
    );
    const result = await fetchMonthlyTopProjects({
      limit: 4,
      viewerUserId: "u1",
    });

    expect(result.projects[0].viewer_has_voted).toBe(true);
  });
});
