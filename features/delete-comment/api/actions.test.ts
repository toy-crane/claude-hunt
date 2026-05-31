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

const { deleteComment } = await import("./actions");

interface StubOptions {
  deleted: Array<{ id: string }>;
  error?: { message: string };
}

function stubDelete(options: StubOptions) {
  const select = vi.fn().mockResolvedValue({
    data: options.deleted,
    error: options.error ?? null,
  });
  const eq = vi.fn().mockReturnValue({ select });
  const del = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ delete: del });
  return { del, eq, select };
}

const validInput = { commentId: "c1", projectId: "p1" };

beforeEach(() => {
  revalidatePathMock.mockReset();
  getClaims.mockReset();
  from.mockReset();
});

describe("deleteComment server action", () => {
  it("rejects missing commentId without touching auth or db", async () => {
    const result = await deleteComment({ commentId: "", projectId: "p1" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid input");
    expect(getClaims).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects missing projectId without touching auth or db", async () => {
    const result = await deleteComment({ commentId: "c1", projectId: "" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid input");
    expect(getClaims).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects signed-out callers without touching the db", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await deleteComment(validInput);

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns ok and revalidates the project page when the delete affects one row", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { del, eq } = stubDelete({ deleted: [{ id: "c1" }] });

    const result = await deleteComment(validInput);

    expect(result).toEqual({ ok: true });
    expect(del).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("id", "c1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/projects/p1");
  });

  it("returns a not-found-or-no-permission error when RLS filters the row out (0 rows returned)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubDelete({ deleted: [] });

    const result = await deleteComment(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("don't have permission");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("surfaces a supabase delete error verbatim", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubDelete({ deleted: [], error: { message: "boom" } });

    const result = await deleteComment(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("boom");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
