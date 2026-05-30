import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const order = vi.fn();
const select = vi.fn(() => ({ order }));
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

  it("returns an empty array when there are no cohorts (null data)", async () => {
    order.mockResolvedValue({ data: null, error: null });

    expect(await fetchCohorts()).toEqual([]);
  });

  it("throws when the cohorts query errors", async () => {
    order.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(fetchCohorts()).rejects.toMatchObject({ message: "boom" });
  });
});
