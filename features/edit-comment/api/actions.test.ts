import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getUser = vi.fn();
const from = vi.fn();
const mockClient = { auth: { getUser }, from };

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

const { editComment } = await import("./actions");

const validInput = { commentId: "c1", projectId: "p1", body: "edited body" };

interface StubOptions {
  data?: Array<{ id: string }> | null;
  error?: { message: string };
}

function stubUpdate(options: StubOptions) {
  const select = vi.fn().mockResolvedValue({
    data: options.data ?? null,
    error: options.error ?? null,
  });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ update });
  return { update, eq, select };
}

beforeEach(() => {
  revalidatePathMock.mockReset();
  getUser.mockReset();
  from.mockReset();
});

describe("editComment server action", () => {
  it("rejects an empty body without touching auth or db", async () => {
    const result = await editComment({ ...validInput, body: "   " });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("내용을 입력해 주세요.");
    expect(getUser).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a missing commentId without touching the db", async () => {
    const result = await editComment({ ...validInput, commentId: "" });

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects signed-out callers without touching the db", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await editComment(validInput);

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("updates the comment body and revalidates the project page on success", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { update, eq } = stubUpdate({ data: [{ id: "c1" }] });

    const result = await editComment(validInput);

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ body: "edited body" });
    expect(eq).toHaveBeenCalledWith("id", "c1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/projects/p1");
  });

  it("returns a not-found-or-no-permission error when RLS filters the row out (0 rows)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubUpdate({ data: [] });

    const result = await editComment(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("don't have permission");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("surfaces a supabase update error verbatim and does not revalidate", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubUpdate({ error: { message: "boom" } });

    const result = await editComment(validInput);

    expect(result).toEqual({ ok: false, error: "boom" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
