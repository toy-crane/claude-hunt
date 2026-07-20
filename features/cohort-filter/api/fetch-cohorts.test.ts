import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

let response: { data: unknown; error: unknown } = { data: null, error: null };

const select = vi.fn(() => Promise.resolve(response));
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
const COHORT_INFLEARN = {
  id: "c4",
  name: "Inflearn",
  created_at: "2020-01-01T00:00:00Z",
};
const COHORT_TOYCRANE = {
  id: "c3",
  name: "TOYCRANE",
  created_at: "2027-01-01T00:00:00Z",
};

beforeEach(() => {
  from.mockClear();
  select.mockClear();
  response = { data: null, error: null };
});

describe("fetchCohorts", () => {
  it("orders the newest class first, whatever order the database returns", async () => {
    response = { data: [COHORT_A, COHORT_B], error: null };

    const rows = await fetchCohorts();

    expect(from).toHaveBeenCalledWith("cohorts");
    expect(rows).toEqual([COHORT_B, COHORT_A]);
  });

  it("keeps the operator-only TOYCRANE cohort in the list (board chips and settings display need it)", async () => {
    response = { data: [COHORT_TOYCRANE, COHORT_A], error: null };

    const rows = await fetchCohorts();

    expect(rows).toContainEqual(COHORT_TOYCRANE);
  });

  it("pins 인프런 first and toycrane last around the classes", async () => {
    response = {
      data: [COHORT_TOYCRANE, COHORT_A, COHORT_INFLEARN, COHORT_B],
      error: null,
    };

    const rows = await fetchCohorts();

    expect(rows).toEqual([
      COHORT_INFLEARN,
      COHORT_B,
      COHORT_A,
      COHORT_TOYCRANE,
    ]);
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
