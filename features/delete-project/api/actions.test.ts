import { beforeEach, describe, expect, it, vi } from "vitest";

const FORBIDDEN_REGEX = /permission/;

const revalidatePathMock = vi.fn();
const updateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}));

const getClaims = vi.fn();
const from = vi.fn();
const storageRemove = vi.fn().mockResolvedValue({ data: [], error: null });
const storageFrom = vi.fn().mockReturnValue({ remove: storageRemove });
const mockClient = {
  auth: { getClaims },
  from,
  storage: { from: storageFrom },
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

const { deleteProject } = await import("./actions");

beforeEach(() => {
  revalidatePathMock.mockClear();
  updateTagMock.mockClear();
  storageRemove.mockClear();
  storageFrom.mockClear();
  getClaims.mockReset();
  from.mockReset();
});

function stubDelete(options: {
  imagePaths?: string[];
  deleted: Array<{ id: string }>;
  deleteError?: { message: string };
}) {
  const selectChain = {
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data:
          options.imagePaths === undefined
            ? null
            : { images: options.imagePaths.map((path) => ({ path })) },
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
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(false);
  });

  it("deletes the row, removes the screenshot, and revalidates on success", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubDelete({
      imagePaths: ["u1/shot.png"],
      deleted: [{ id: "proj-1" }],
    });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(true);
    expect(storageRemove).toHaveBeenCalledWith(["u1/shot.png"]);
    expect(updateTagMock).toHaveBeenCalledWith("projects-grid");
    // /settings reads its own list via fetchMyProjects which is not
    // tagged, so we explicitly revalidate the path.
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  it("reports forbidden when RLS returns 0 rows", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubDelete({ imagePaths: ["u1/shot.png"], deleted: [] });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(FORBIDDEN_REGEX);
  });

  it("succeeds even when the project has no images (no cleanup needed)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubDelete({ imagePaths: [], deleted: [{ id: "proj-1" }] });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(true);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("still returns ok when storage removal fails (non-blocking cleanup)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubDelete({
      imagePaths: ["u1/shot.webp"],
      deleted: [{ id: "proj-1" }],
    });
    storageRemove.mockResolvedValueOnce({
      data: null,
      error: { message: "storage down" },
    });

    const result = await deleteProject({ projectId: "proj-1" });

    expect(result.ok).toBe(true);
    expect(storageRemove).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith("projects-grid");
  });
});
