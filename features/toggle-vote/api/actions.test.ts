import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const updateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}));

const getClaims = vi.fn();
const from = vi.fn();
const mockClient = { auth: { getClaims }, from };

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const { toggleVote } = await import("./actions");

beforeEach(() => {
  revalidatePathMock.mockClear();
  updateTagMock.mockClear();
  getClaims.mockReset();
  from.mockReset();
});

function stubSelect(existing: { id: string } | null) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: existing, error: null });
  const eq2 = vi.fn().mockReturnValue({ maybeSingle });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { select };
}

function stubInsertSuccess() {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  return { insert };
}

function stubDeleteSuccess() {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  return { delete: vi.fn().mockReturnValue({ eq }) };
}

describe("toggleVote server action", () => {
  it("rejects signed-out callers", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await toggleVote("p1");

    expect(result.ok).toBe(false);
  });

  it("inserts a new vote when the viewer hasn't voted yet", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const selectQ = stubSelect(null);
    const insertQ = stubInsertSuccess();
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return selectQ;
      }
      return insertQ;
    });

    const result = await toggleVote("p1");

    expect(result.ok).toBe(true);
    expect(result.voted).toBe(true);
    expect(insertQ.insert).toHaveBeenCalledWith({
      user_id: "u1",
      project_id: "p1",
    });
    expect(updateTagMock).toHaveBeenCalledWith("projects-grid");
    expect(revalidatePathMock).toHaveBeenCalledWith("/projects/p1");
  });

  it("deletes the existing vote on second call (toggle off)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const selectQ = stubSelect({ id: "v1" });
    const deleteQ = stubDeleteSuccess();
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return selectQ;
      }
      return deleteQ;
    });

    const result = await toggleVote("p1");

    expect(result.ok).toBe(true);
    expect(result.voted).toBe(false);
    expect(updateTagMock).toHaveBeenCalledWith("projects-grid");
    expect(revalidatePathMock).toHaveBeenCalledWith("/projects/p1");
  });

  it("surfaces a DB error (e.g. self-vote trigger) on insert", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const selectQ = stubSelect(null);
    const insert = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "users cannot vote on their own projects" },
    });
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return selectQ;
      }
      return { insert };
    });

    const result = await toggleVote("p1");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("cannot vote on their own");
  });
});
