import { beforeEach, describe, expect, it, vi } from "vitest";

// The count read uses the `use cache` directive (a no-op under the vitest
// transform); stub the cache primitives so the real query path runs and the
// module import never reaches the real Data Cache.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const select = vi.fn();
const from = vi.fn(() => ({ select }));

vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: () => ({ from }),
}));

const { fetchProjectCount } = await import("./fetch-project-count");

beforeEach(() => {
  from.mockClear();
  select.mockReset();
});

describe("fetchProjectCount", () => {
  it("requests a head-only exact count of the projects table", async () => {
    select.mockResolvedValue({ count: 7, error: null });

    const result = await fetchProjectCount();

    expect(from).toHaveBeenCalledWith("projects");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(result).toBe(7);
  });

  it("returns 0 when supabase reports a null count", async () => {
    select.mockResolvedValue({ count: null, error: null });

    expect(await fetchProjectCount()).toBe(0);
  });

  it("throws when the count query errors", async () => {
    select.mockResolvedValue({ count: null, error: { message: "boom" } });

    await expect(fetchProjectCount()).rejects.toMatchObject({
      message: "boom",
    });
  });
});
