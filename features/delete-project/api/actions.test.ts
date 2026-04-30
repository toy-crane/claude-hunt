import { beforeEach, describe, expect, it, vi } from "vitest";

const FORBIDDEN_REGEX = /permission/;

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getUser = vi.fn();
const from = vi.fn();
const storageRemove = vi.fn().mockResolvedValue({ data: [], error: null });
const storageFrom = vi.fn().mockReturnValue({ remove: storageRemove });
const mockClient = {
  auth: { getUser },
  from,
  storage: { from: storageFrom },
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

const { deleteProject } = await import("./actions");

beforeEach(() => {
  revalidatePathMock.mockClear();
  storageRemove.mockClear();
  storageFrom.mockClear();
  getUser.mockReset();
  from.mockReset();
});

function stubDelete(options: {
  screenshotPath?: string | null;
  deleted: Array<{ id: string }>;
  deleteError?: { message: string };
}) {
  const selectChain = {
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data:
          options.screenshotPath === undefined
            ? null
            : { screenshot_path: options.screenshotPath },
        error: null,
      }),
    }),
  };
  const deleteSelect = vi.fn().mockResolvedValue({
    data: options.deleted,
    error: options.deleteError ?? null,
  });
  const deleteChain = {
    eq: vi.fn().mockReturnValue({ select: deleteSelect }),
  };
  let call = 0;
  from.mockImplementation(() => {
    call += 1;
    if (call === 1) {
      return { select: vi.fn().mockReturnValue(selectChain) };
    }
    return { delete: vi.fn().mockReturnValue(deleteChain) };
  });
}

describe("deleteProject server action", () => {
  it("rejects signed-out callers", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(false);
  });

  it("deletes the row, removes the screenshot, and revalidates on success", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubDelete({
      screenshotPath: "u1/shot.png",
      deleted: [{ id: "proj-1" }],
    });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(true);
    expect(storageRemove).toHaveBeenCalledWith(["u1/shot.png"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("reports forbidden when RLS returns 0 rows", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubDelete({ screenshotPath: "u1/shot.png", deleted: [] });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(FORBIDDEN_REGEX);
  });

  it("succeeds even when the screenshot path is missing (no cleanup needed)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubDelete({ screenshotPath: null, deleted: [{ id: "proj-1" }] });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(true);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("still returns ok when storage removal fails (non-blocking cleanup)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubDelete({
      screenshotPath: "u1/shot.webp",
      deleted: [{ id: "proj-1" }],
    });
    storageRemove.mockResolvedValueOnce({
      data: null,
      error: { message: "storage down" },
    });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(true);
    expect(storageRemove).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });
});
