import { beforeEach, describe, expect, it, vi } from "vitest";

interface SupabaseRow {
  author_avatar_url: string | null;
  author_display_name: string | null;
  cohort_id: string | null;
  cohort_label: string | null;
  cohort_name: string | null;
  created_at: string;
  github_url: string | null;
  id: string | null;
  images: unknown;
  project_url: string | null;
  tagline: string | null;
  title: string | null;
  updated_at: string;
  user_id: string | null;
  vote_count: number;
}

const projectRow: SupabaseRow = {
  id: "p1",
  user_id: "u1",
  cohort_id: "c1",
  cohort_label: "Cohort A",
  cohort_name: "A",
  title: "Project One",
  tagline: "tagline",
  project_url: "https://example.com",
  github_url: null,
  images: [{ path: "screens/p1/cover.png" }],
  vote_count: 3,
  author_display_name: "alice",
  author_avatar_url: null,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-02T00:00:00Z",
};

const projectMaybeSingle = vi.fn();
const voteMaybeSingle = vi.fn();
const getPublicUrl = vi.fn((path: string) => ({
  data: { publicUrl: `https://cdn.example.com/${path}` },
}));

const supabase = {
  from: vi.fn((table: string) => {
    if (table === "projects_with_vote_count") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: projectMaybeSingle })),
        })),
      };
    }
    if (table === "votes") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: voteMaybeSingle })),
          })),
        })),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  }),
  storage: {
    from: vi.fn(() => ({ getPublicUrl })),
  },
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}));

const { fetchProjectCore, fetchViewerVote, fetchProjectDetail } = await import(
  "./queries"
);

beforeEach(() => {
  projectMaybeSingle.mockReset();
  voteMaybeSingle.mockReset();
  supabase.from.mockClear();
});

describe("fetchProjectCore", () => {
  it("returns a viewer-agnostic core row with no viewer fields", async () => {
    projectMaybeSingle.mockResolvedValue({ data: projectRow, error: null });

    const core = await fetchProjectCore("p1");

    expect(core).not.toBeNull();
    if (!core) {
      return;
    }
    expect(core.id).toBe("p1");
    expect(core.vote_count).toBe(3);
    expect(core.primaryImageUrl).toBe(
      "https://cdn.example.com/screens/p1/cover.png"
    );
    // Core must not expose viewer-specific fields.
    expect("viewer_has_voted" in core).toBe(false);
  });

  it("returns null when no row matches", async () => {
    projectMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchProjectCore("nope")).toBeNull();
  });

  it("propagates the Supabase error", async () => {
    projectMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error("db down"),
    });
    await expect(fetchProjectCore("p1")).rejects.toThrow("db down");
  });
});

describe("fetchViewerVote", () => {
  it("returns true when a vote row exists", async () => {
    voteMaybeSingle.mockResolvedValue({
      data: { project_id: "p1" },
      error: null,
    });
    expect(await fetchViewerVote("p1", "u1")).toBe(true);
  });

  it("returns false when no vote row matches", async () => {
    voteMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchViewerVote("p1", "u1")).toBe(false);
  });
});

describe("fetchProjectDetail wrapper", () => {
  it("merges core and viewer vote into a single shape", async () => {
    projectMaybeSingle.mockResolvedValue({ data: projectRow, error: null });
    voteMaybeSingle.mockResolvedValue({
      data: { project_id: "p1" },
      error: null,
    });

    const detail = await fetchProjectDetail("p1", "u1");

    expect(detail).not.toBeNull();
    expect(detail?.id).toBe("p1");
    expect(detail?.viewer_has_voted).toBe(true);
    expect(detail?.vote_count).toBe(3);
  });

  it("skips the votes query entirely when no viewer is signed in", async () => {
    projectMaybeSingle.mockResolvedValue({ data: projectRow, error: null });

    const detail = await fetchProjectDetail("p1", null);

    expect(detail?.viewer_has_voted).toBe(false);
    // The `votes` table must NOT be queried when viewer is anonymous.
    expect(supabase.from).not.toHaveBeenCalledWith("votes");
  });

  it("returns null when the project does not exist (regardless of viewer)", async () => {
    projectMaybeSingle.mockResolvedValue({ data: null, error: null });
    voteMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchProjectDetail("nope", "u1")).toBeNull();
  });
});
