import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

// The query chains `.order()` twice — primary sort then tie-breaker — so the
// two links are separate mocks: the first returns the second, and only the
// second resolves to the result.
const orderTieBreak = vi.fn();
const orderPrimary = vi.fn(() => ({ order: orderTieBreak }));
const select = vi.fn(() => ({ order: orderPrimary }));
const from = vi.fn(() => ({ select }));

vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: () => ({ from }),
}));

const { fetchCohorts } = await import("./fetch-cohorts");

const COHORT_NEWEST = { id: "c2", name: "LGE-2", display_order: 2 };
const COHORT_OLDEST = { id: "c1", name: "LGE-1", display_order: 1 };
const COHORT_TOYCRANE = { id: "c3", name: "TOYCRANE", display_order: 0 };

beforeEach(() => {
  from.mockClear();
  select.mockClear();
  orderPrimary.mockClear();
  orderTieBreak.mockReset();
});

describe("fetchCohorts", () => {
  it("reads cohorts newest class first", async () => {
    orderTieBreak.mockResolvedValue({
      data: [COHORT_NEWEST, COHORT_OLDEST],
      error: null,
    });

    const rows = await fetchCohorts();

    expect(from).toHaveBeenCalledWith("cohorts");
    expect(orderPrimary).toHaveBeenCalledWith("display_order", {
      ascending: false,
    });
    expect(rows).toEqual([COHORT_NEWEST, COHORT_OLDEST]);
  });

  it("breaks ties on name so the order never wobbles between requests", async () => {
    orderTieBreak.mockResolvedValue({ data: [], error: null });

    await fetchCohorts();

    expect(orderTieBreak).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("keeps the operator-only TOYCRANE cohort in the list (board filter and settings display need it)", async () => {
    orderTieBreak.mockResolvedValue({
      data: [COHORT_NEWEST, COHORT_TOYCRANE],
      error: null,
    });

    const rows = await fetchCohorts();

    expect(rows).toEqual([COHORT_NEWEST, COHORT_TOYCRANE]);
  });

  it("returns an empty array when there are no cohorts (null data)", async () => {
    orderTieBreak.mockResolvedValue({ data: null, error: null });

    expect(await fetchCohorts()).toEqual([]);
  });

  it("throws when the cohorts query errors", async () => {
    orderTieBreak.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(fetchCohorts()).rejects.toMatchObject({ message: "boom" });
  });
});
