import { beforeEach, describe, expect, it, vi } from "vitest";

const PERMISSION_ERROR_REGEX = /permission/;

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
  storageFrom.mockClear();
  storageRemove.mockClear();
  storageRemove.mockResolvedValue({ data: [], error: null });
  getUser.mockReset();
  from.mockReset();
});

function stubFrom(options: {
  currentScreenshotPath?: string | null;
  updateRows?: Array<{ id: string }>;
  updateError?: { message: string };
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data:
      options.currentScreenshotPath === undefined
        ? null
        : { screenshot_path: options.currentScreenshotPath },
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
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await editProject(validInput);

    expect(result.ok).toBe(false);
  });

  it("updates the project and revalidates the home page on success", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("reports forbidden when RLS returns zero rows (spoofed projectId)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubFrom({ updateRows: [] });

    const result = await editProject(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(PERMISSION_ERROR_REGEX);
  });

  it("includes the new image array in the update payload", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { update } = stubFrom({
      currentScreenshotPath: "u1/old-shot.webp",
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
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubFrom({
      currentScreenshotPath: "u1/old-shot.webp",
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
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubFrom({
      updateRows: [{ id: validInput.projectId }],
    });

    const result = await editProject(validInput);

    expect(result.ok).toBe(true);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("does not remove storage when RLS rejects the update (owner-gated)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubFrom({
      currentScreenshotPath: "u1/old-shot.webp",
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
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubFrom({
      currentScreenshotPath: "u1/old-shot.webp",
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });
});
