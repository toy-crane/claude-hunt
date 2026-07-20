import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

let response: { data: unknown; error: unknown } = { data: null, error: null };

// `.order()` is chained twice, and the chain runs when awaited — mirroring
// PostgREST, where every modifier returns the builder and awaiting it executes
// the query. A mock that resolved on the first `.order()` would not survive the
// second call, so each link is a real promise carrying the next `.order()`.
function chain() {
  return Object.assign(Promise.resolve(response), { order });
}
const order = vi.fn(() => chain());
const select = vi.fn(() => chain());
const from = vi.fn(() => ({ select }));

vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: () => ({ from }),
}));

const { fetchCohorts } = await import("./fetch-cohorts");

const COHORT_A = {
  id: "c1",
  name: "LGE-1",
  created_at: "2026-04-14T06:00:50Z",
};
const COHORT_B = {
  id: "c2",
  name: "LGE-2",
  created_at: "2026-04-14T06:00:52Z",
};
const COHORT_TOYCRANE = {
  id: "c3",
  name: "TOYCRANE",
  created_at: "2027-01-01T00:00:00Z",
};

beforeEach(() => {
  from.mockClear();
  select.mockClear();
  order.mockClear();
  response = { data: null, error: null };
});

describe("fetchCohorts", () => {
  it("asks the database for the newest class first, breaking ties by name", async () => {
    response = { data: [COHORT_B, COHORT_A], error: null };

    const rows = await fetchCohorts();

    expect(from).toHaveBeenCalledWith("cohorts");
    expect(order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(order).toHaveBeenNthCalledWith(2, "name", { ascending: true });
    expect(rows).toEqual([COHORT_B, COHORT_A]);
  });

  it("keeps the operator-only TOYCRANE cohort in the list (board chips and settings display need it)", async () => {
    response = { data: [COHORT_TOYCRANE, COHORT_A], error: null };

    const rows = await fetchCohorts();

    expect(rows).toContainEqual(COHORT_TOYCRANE);
  });

  it("pins TOYCRANE last even though it is the newest row", async () => {
    response = { data: [COHORT_TOYCRANE, COHORT_B, COHORT_A], error: null };

    const rows = await fetchCohorts();

    expect(rows).toEqual([COHORT_B, COHORT_A, COHORT_TOYCRANE]);
  });

  it("returns an empty array when there are no cohorts (null data)", async () => {
    response = { data: null, error: null };

    expect(await fetchCohorts()).toEqual([]);
  });

  it("throws when the cohorts query errors", async () => {
    response = { data: null, error: { message: "boom" } };

    await expect(fetchCohorts()).rejects.toMatchObject({ message: "boom" });
  });
});
