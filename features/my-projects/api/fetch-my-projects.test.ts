import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
const storageFrom = vi.fn(() => ({
  getPublicUrl: (path: string) => ({
    data: { publicUrl: `https://cdn.example.com/${path}` },
  }),
}));
const mockClient = { from, storage: { from: storageFrom } };

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const { fetchMyProjects } = await import("./fetch-my-projects");

const ROW_A = {
  id: "p1",
  title: "Alpha",
  tagline: "tag",
  primary_image_path: "u1/p1.png",
  created_at: "2026-02-01T00:00:00Z",
  vote_count: 5,
};
const ROW_B = {
  ...ROW_A,
  id: "p2",
  title: "Beta",
  primary_image_path: null,
  created_at: "2026-01-01T00:00:00Z",
};

interface StubOptions {
  data: unknown[] | null;
  error?: { message: string };
}

function stubQuery(options: StubOptions) {
  const order = vi.fn().mockResolvedValue({
    data: options.data,
    error: options.error ?? null,
  });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ select });
  return { select, eq, order };
}

beforeEach(() => {
  from.mockReset();
  storageFrom.mockClear();
});

describe("fetchMyProjects", () => {
  it("scopes the read to the viewer and orders newest first", async () => {
    const { eq, order } = stubQuery({ data: [ROW_A, ROW_B] });

    await fetchMyProjects("u1");

    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("resolves each row's primary_image_path to a public screenshot URL", async () => {
    stubQuery({ data: [ROW_A] });

    const rows = await fetchMyProjects("u1");

    expect(rows).toHaveLength(1);
    expect(rows[0].screenshotUrl).toBe("https://cdn.example.com/u1/p1.png");
    expect(storageFrom).toHaveBeenCalledWith("project-screenshots");
  });

  it("returns an empty screenshotUrl for rows with no primary image", async () => {
    stubQuery({ data: [ROW_B] });

    const rows = await fetchMyProjects("u1");

    expect(rows[0].screenshotUrl).toBe("");
  });

  it("returns an empty array when the viewer has no projects (null data)", async () => {
    stubQuery({ data: null });

    const rows = await fetchMyProjects("u1");

    expect(rows).toEqual([]);
  });

  it("throws when the query returns a supabase error", async () => {
    stubQuery({ data: null, error: { message: "boom" } });

    await expect(fetchMyProjects("u1")).rejects.toMatchObject({
      message: "boom",
    });
  });
});
