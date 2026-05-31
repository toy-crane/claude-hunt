import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getClaims = vi.fn();
const from = vi.fn();
const mockClient = { auth: { getClaims }, from };

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const { toggleReaction } = await import("./actions");

const validInput = {
  commentId: "c1",
  projectId: "p1",
  emoji: "👍" as const,
};

function stubSelect(existing: { id: string } | null) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: existing, error: null });
  const eq3 = vi.fn().mockReturnValue({ maybeSingle });
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { select };
}

function stubInsert(error: { message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ data: null, error });
  return { insert };
}

function stubDelete(error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ data: null, error });
  const del = vi.fn().mockReturnValue({ eq });
  return { delete: del };
}

beforeEach(() => {
  revalidatePathMock.mockReset();
  getClaims.mockReset();
  from.mockReset();
});

describe("toggleReaction server action", () => {
  it("rejects an invalid emoji without touching auth or db", async () => {
    const result = await toggleReaction({
      ...validInput,
      emoji: "🙅" as unknown as (typeof validInput)["emoji"],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(getClaims).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects an empty commentId without touching auth or db", async () => {
    const result = await toggleReaction({ ...validInput, commentId: "" });

    expect(result.ok).toBe(false);
    expect(getClaims).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out caller after schema parse", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await toggleReaction(validInput);

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("inserts a new reaction and revalidates when the viewer hasn't reacted with this emoji", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const selectQ = stubSelect(null);
    const insertQ = stubInsert();
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      return call === 1 ? selectQ : insertQ;
    });

    const result = await toggleReaction(validInput);

    expect(result).toEqual({ ok: true, state: "added" });
    expect(insertQ.insert).toHaveBeenCalledWith({
      comment_id: "c1",
      user_id: "u1",
      emoji: "👍",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/projects/p1");
  });

  it("deletes the existing reaction and revalidates when the viewer already reacted with this emoji", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const selectQ = stubSelect({ id: "r1" });
    const deleteQ = stubDelete();
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      return call === 1 ? selectQ : deleteQ;
    });

    const result = await toggleReaction(validInput);

    expect(result).toEqual({ ok: true, state: "removed" });
    expect(deleteQ.delete).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/projects/p1");
  });

  it("surfaces an insert error without state and without revalidate", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const selectQ = stubSelect(null);
    const insertQ = stubInsert({ message: "insert boom" });
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      return call === 1 ? selectQ : insertQ;
    });

    const result = await toggleReaction(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("insert boom");
    expect(result.state).toBeUndefined();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("surfaces a delete error without state and without revalidate", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const selectQ = stubSelect({ id: "r1" });
    const deleteQ = stubDelete({ message: "delete boom" });
    let call = 0;
    from.mockImplementation(() => {
      call += 1;
      return call === 1 ? selectQ : deleteQ;
    });

    const result = await toggleReaction(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("delete boom");
    expect(result.state).toBeUndefined();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
