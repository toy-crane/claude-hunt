import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const order = vi.fn();
const not = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ not }));
const from = vi.fn(() => ({ select }));

vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: () => ({ from }),
}));

const { fetchCohorts } = await import("./fetch-cohorts");

const COHORT_A = { id: "c1", name: "A" };
const COHORT_B = { id: "c2", name: "B" };

beforeEach(() => {
  from.mockClear();
  select.mockClear();
  not.mockClear();
  order.mockReset();
});

describe("fetchCohorts", () => {
  it("reads cohorts alphabetically by name", async () => {
    order.mockResolvedValue({ data: [COHORT_A, COHORT_B], error: null });

    const rows = await fetchCohorts();

    expect(from).toHaveBeenCalledWith("cohorts");
    expect(order).toHaveBeenCalledWith("name", { ascending: true });
    expect(rows).toEqual([COHORT_A, COHORT_B]);
  });

  it("excludes the operator-only TOYCRANE cohort from the query", async () => {
    order.mockResolvedValue({ data: [COHORT_A], error: null });

    await fetchCohorts();

    expect(not).toHaveBeenCalledWith("name", "in", "(TOYCRANE)");
  });

  it("returns an empty array when there are no cohorts (null data)", async () => {
    order.mockResolvedValue({ data: null, error: null });

    expect(await fetchCohorts()).toEqual([]);
  });

  it("throws when the cohorts query errors", async () => {
    order.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(fetchCohorts()).rejects.toMatchObject({ message: "boom" });
  });
});
