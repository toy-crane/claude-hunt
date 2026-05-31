import { beforeEach, describe, expect, it, vi } from "vitest";

const PERMISSION_ERROR_REGEX = /permission/;

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

const { editProject } = await import("./actions");

const validInput = {
  projectId: "11111111-1111-1111-1111-111111111111",
  title: "Edited Title",
  tagline: "Edited tagline",
  projectUrl: "https://edited.example.com",
  imagePaths: ["u1/old-shot.webp"],
};

beforeEach(() => {
  revalidatePathMock.mockClear();
  updateTagMock.mockClear();
  storageFrom.mockClear();
  storageRemove.mockClear();
  storageRemove.mockResolvedValue({ data: [], error: null });
  getClaims.mockReset();
  from.mockReset();
});

function stubFrom(options: {
  currentImagePaths?: string[];
  updateRows?: Array<{ id: string }>;
  updateError?: { message: string };
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data:
      options.currentImagePaths === undefined
        ? null
        : {
            images: options.currentImagePaths.map((path) => ({ path })),
          },
    error: null,
  });
  const selectEq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: selectEq });

  const updateSelect = vi.fn().mockResolvedValue({
    data: options.updateRows ?? [],
    error: options.updateError ?? null,
  });
  const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  from.mockReturnValue({ select, update });
  return { select, update, updateEq, updateSelect };
}

describe("editProject server action", () => {
  it("rejects when the user is not signed in", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await editProject(validInput);

    expect(result.ok).toBe(false);
  });

  it("updates the project and revalidates the home page on success", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { update, updateEq } = stubFrom({
      updateRows: [{ id: validInput.projectId }],
    });

    const result = await editProject(validInput);

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Edited Title",
        tagline: "Edited tagline",
        project_url: "https://edited.example.com",
      })
    );
    expect(updateEq).toHaveBeenCalledWith("id", validInput.projectId);
    expect(updateTagMock).toHaveBeenCalledWith("projects-grid");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/projects/${validInput.projectId}`
    );
    // /settings reads its own list via fetchMyProjects which is not
    // tagged, so we explicitly revalidate the path.
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  it("reports forbidden when RLS returns zero rows (spoofed projectId)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubFrom({ updateRows: [] });

    const result = await editProject(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(PERMISSION_ERROR_REGEX);
  });

  it("includes the new image array in the update payload", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { update } = stubFrom({
      currentImagePaths: ["u1/old-shot.webp"],
      updateRows: [{ id: validInput.projectId }],
    });

    await editProject({
      ...validInput,
      imagePaths: ["u1/new-shot.webp"],
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [{ path: "u1/new-shot.webp" }],
      })
    );
  });

  it("removes the previous screenshot from storage after a successful replace", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubFrom({
      currentImagePaths: ["u1/old-shot.webp"],
      updateRows: [{ id: validInput.projectId }],
    });

    const result = await editProject({
      ...validInput,
      imagePaths: ["u1/new-shot.webp"],
    });

    expect(result.ok).toBe(true);
    expect(storageFrom).toHaveBeenCalledWith("project-screenshots");
    expect(storageRemove).toHaveBeenCalledTimes(1);
    expect(storageRemove).toHaveBeenCalledWith(["u1/old-shot.webp"]);
  });

  it("does not touch storage when the screenshot is not replaced", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubFrom({
      updateRows: [{ id: validInput.projectId }],
    });

    const result = await editProject(validInput);

    expect(result.ok).toBe(true);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("does not remove storage when RLS rejects the update (owner-gated)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubFrom({
      currentImagePaths: ["u1/old-shot.webp"],
      updateRows: [],
    });

    const result = await editProject({
      ...validInput,
      imagePaths: ["u1/new-shot.webp"],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(PERMISSION_ERROR_REGEX);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("still returns ok when storage removal fails (non-blocking cleanup)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubFrom({
      currentImagePaths: ["u1/old-shot.webp"],
      updateRows: [{ id: validInput.projectId }],
    });
    storageRemove.mockResolvedValueOnce({
      data: null,
      error: { message: "storage down" },
    });

    const result = await editProject({
      ...validInput,
      imagePaths: ["u1/new-shot.webp"],
    });

    expect(result.ok).toBe(true);
    expect(storageRemove).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith("projects-grid");
  });
});
