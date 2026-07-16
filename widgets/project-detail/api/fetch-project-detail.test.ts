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

// A syntactically valid UUID that maps to `projectRow`.
const VALID_ID = "74394177-3371-4cfe-8ba8-a4cefb884cd5";
// A different valid UUID that matches no row.
const MISSING_ID = "00000000-0000-4000-8000-000000000000";
// The malformed id from the Sentry report: a trailing url-encoded backslash.
const MALFORMED_ID = "74394177-3371-4cfe-8ba8-a4cefb884cd5%5C";

const projectRow: SupabaseRow = {
  id: VALID_ID,
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
  createServerClient: vi.fn().mockResolvedValue(supabase),
}));

// fetchProjectCore now uses the cookie-free anon client under `use cache`.
vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: vi.fn(() => supabase),
}));

// `use cache` directive is a no-op under the vitest transform; stub the
// cache primitives so the cached fns run as plain async functions.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { fetchProjectCore, fetchViewerVote, fetchProjectDetail } = await import(
  "./fetch-project-detail"
);

beforeEach(() => {
  projectMaybeSingle.mockReset();
  voteMaybeSingle.mockReset();
  supabase.from.mockClear();
});

describe("fetchProjectCore", () => {
  it("returns a viewer-agnostic core row with no viewer fields", async () => {
    projectMaybeSingle.mockResolvedValue({ data: projectRow, error: null });

    const core = await fetchProjectCore(VALID_ID);

    expect(core).not.toBeNull();
    if (!core) {
      return;
    }
    expect(core.id).toBe(VALID_ID);
    expect(core.vote_count).toBe(3);
    expect(core.primaryImageUrl).toBe(
      "https://cdn.example.com/screens/p1/cover.png"
    );
    // Core must not expose viewer-specific fields.
    expect("viewer_has_voted" in core).toBe(false);
  });

  it("returns null when a valid id matches no row", async () => {
    projectMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchProjectCore(MISSING_ID)).toBeNull();
  });

  it("returns null for a malformed-uuid id without hitting the database", async () => {
    const core = await fetchProjectCore(MALFORMED_ID);

    expect(core).toBeNull();
    // The guard must short-circuit before any query is issued, so the
    // invalid uuid never reaches Postgres (error 22P02).
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("propagates the Supabase error", async () => {
    projectMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error("db down"),
    });
    await expect(fetchProjectCore(VALID_ID)).rejects.toThrow("db down");
  });
});

describe("fetchViewerVote", () => {
  it("returns true when a vote row exists", async () => {
    voteMaybeSingle.mockResolvedValue({
      data: { project_id: VALID_ID },
      error: null,
    });
    expect(await fetchViewerVote(VALID_ID, "u1")).toBe(true);
  });

  it("returns false when no vote row matches", async () => {
    voteMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchViewerVote(VALID_ID, "u1")).toBe(false);
  });
});

describe("fetchProjectDetail wrapper", () => {
  it("merges core and viewer vote into a single shape", async () => {
    projectMaybeSingle.mockResolvedValue({ data: projectRow, error: null });
    voteMaybeSingle.mockResolvedValue({
      data: { project_id: VALID_ID },
      error: null,
    });

    const detail = await fetchProjectDetail(VALID_ID, "u1");

    expect(detail).not.toBeNull();
    expect(detail?.id).toBe(VALID_ID);
    expect(detail?.viewer_has_voted).toBe(true);
    expect(detail?.vote_count).toBe(3);
  });

  it("skips the votes query entirely when no viewer is signed in", async () => {
    projectMaybeSingle.mockResolvedValue({ data: projectRow, error: null });

    const detail = await fetchProjectDetail(VALID_ID, null);

    expect(detail?.viewer_has_voted).toBe(false);
    // The `votes` table must NOT be queried when viewer is anonymous.
    expect(supabase.from).not.toHaveBeenCalledWith("votes");
  });

  it("returns null when the project does not exist (regardless of viewer)", async () => {
    projectMaybeSingle.mockResolvedValue({ data: null, error: null });
    voteMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchProjectDetail(MISSING_ID, "u1")).toBeNull();
  });
});
