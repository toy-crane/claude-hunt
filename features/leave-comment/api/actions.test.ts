import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getClaims = vi.fn();
const from = vi.fn();
const mockClient = { auth: { getClaims }, from };

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

const { leaveComment } = await import("./actions");

const validInput = { projectId: "p1", body: "Nice work!" };

interface StubOptions {
  error?: { message: string };
  inserted?: { id: string } | null;
}

function stubInsert(options: StubOptions) {
  const single = vi.fn().mockResolvedValue({
    data: options.inserted ?? null,
    error: options.error ?? null,
  });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  from.mockReturnValue({ insert });
  return { insert, select, single };
}

beforeEach(() => {
  revalidatePathMock.mockReset();
  getClaims.mockReset();
  from.mockReset();
});

describe("leaveComment server action", () => {
  it("rejects an empty body without touching auth or db", async () => {
    const result = await leaveComment({ projectId: "p1", body: "  " });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("내용을 입력해 주세요.");
    expect(getClaims).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a missing projectId without touching auth or db", async () => {
    const result = await leaveComment({ projectId: "", body: "hi" });

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects signed-out callers without touching the db", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await leaveComment(validInput);

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("inserts the comment for the signed-in user and revalidates the project page", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { insert, single } = stubInsert({ inserted: { id: "c-new" } });

    const result = await leaveComment(validInput);

    expect(result).toEqual({ ok: true, commentId: "c-new" });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "p1",
        user_id: "u1",
        parent_comment_id: null,
        body: "Nice work!",
      })
    );
    expect(single).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/projects/p1");
  });

  it("threads a reply by passing the parent comment id and reusing the optimistic id", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const optimisticId = "11111111-1111-4111-8111-111111111111";
    const { insert } = stubInsert({ inserted: { id: optimisticId } });

    await leaveComment({
      ...validInput,
      parentCommentId: "parent-1",
      optimisticId,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: optimisticId,
        parent_comment_id: "parent-1",
      })
    );
  });

  it("surfaces a supabase insert error verbatim and does not revalidate", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubInsert({ error: { message: "boom" } });

    const result = await leaveComment(validInput);

    expect(result).toEqual({ ok: false, error: "boom" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
