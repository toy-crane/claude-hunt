import { beforeEach, describe, expect, it, vi } from "vitest";

const PERMISSION_ERROR_REGEX = /내가 제출한 프로젝트만 편집할 수 있어요/;

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
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const captureProjectFirstScreen = vi.fn();
const startProjectHighlights = vi.fn();
const discardCapturedImage = vi.fn();
vi.mock("@entities/project/server", () => ({
  captureProjectFirstScreen,
  startProjectHighlights,
  discardCapturedImage,
}));

const scheduled: Array<() => unknown> = [];
vi.mock("next/server", () => ({
  after: (task: () => unknown) => {
    scheduled.push(task);
  },
}));

const { editProject } = await import("./actions");

const URL_UNREACHABLE =
  "프로젝트 URL을 열 수 없어요. 주소가 맞는지, 로그인 없이 열리는지 확인해 주세요.";

const validInput = {
  projectId: "11111111-1111-1111-1111-111111111111",
  title: "Edited Title",
  tagline: "Edited tagline",
  projectUrl: "https://edited.example.com",
  imagePaths: ["u1/old-shot.webp"],
};

beforeEach(() => {
  captureProjectFirstScreen.mockReset();
  startProjectHighlights.mockReset();
  discardCapturedImage.mockReset();
  scheduled.length = 0;
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
  ownerId?: string;
  updateRows?: Array<{ id: string }>;
  updateError?: { message: string };
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data:
      options.currentImagePaths === undefined
        ? null
        : {
            images: options.currentImagePaths.map((path) => ({ path })),
            user_id: options.ownerId ?? "u1",
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
    expect(updateTagMock).toHaveBeenCalledWith("projects");
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

  it("writes the description to the update when provided", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { update } = stubFrom({
      updateRows: [{ id: validInput.projectId }],
    });

    await editProject({ ...validInput, description: "수정된 설명입니다." });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ description: "수정된 설명입니다." })
    );
  });

  it("writes a null description when omitted", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { update } = stubFrom({
      updateRows: [{ id: validInput.projectId }],
    });

    await editProject(validInput);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
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
    expect(updateTagMock).toHaveBeenCalledWith("projects");
  });

  it("recaptures the first screen and keeps filling highlights when every image was removed", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { update } = stubFrom({
      currentImagePaths: ["u1/old-shot.webp"],
      updateRows: [{ id: validInput.projectId }],
    });
    const session = { close: vi.fn() };
    captureProjectFirstScreen.mockResolvedValue({
      ok: true,
      path: "u1/first.jpg",
      session,
    });

    const result = await editProject({
      ...validInput,
      description: "비밀번호 : 0000",
      imagePaths: [],
    });

    expect(result.ok).toBe(true);
    expect(captureProjectFirstScreen).toHaveBeenCalledWith({
      projectUrl: "https://edited.example.com",
      userId: "u1",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ images: [{ path: "u1/first.jpg" }] })
    );
    expect(scheduled).toHaveLength(1);
    await scheduled[0]?.();
    expect(startProjectHighlights).toHaveBeenCalledWith({
      session,
      projectId: validInput.projectId,
      userId: "u1",
      project: {
        title: "Edited Title",
        tagline: "Edited tagline",
        description: "비밀번호 : 0000",
      },
      images: [{ path: "u1/first.jpg" }],
    });
  });

  it("saves nothing and points at the URL when the project cannot be opened", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { update } = stubFrom({
      currentImagePaths: ["u1/old-shot.webp"],
      updateRows: [{ id: validInput.projectId }],
    });
    captureProjectFirstScreen.mockResolvedValue({
      ok: false,
      reason: "unreachable",
    });

    const result = await editProject({ ...validInput, imagePaths: [] });

    expect(result).toEqual({
      ok: false,
      field: "projectUrl",
      error: URL_UNREACHABLE,
    });
    expect(update).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("does not recapture when images remain, even if the URL changed", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubFrom({
      currentImagePaths: ["u1/old-shot.webp"],
      updateRows: [{ id: validInput.projectId }],
    });

    await editProject({
      ...validInput,
      projectUrl: "https://moved.example.com",
    });

    expect(captureProjectFirstScreen).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });

  it("drops the captured first screen when the save is refused", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    stubFrom({ currentImagePaths: ["u1/old-shot.webp"], updateRows: [] });
    const session = { close: vi.fn() };
    captureProjectFirstScreen.mockResolvedValue({
      ok: true,
      path: "u1/first.jpg",
      session,
    });

    const result = await editProject({ ...validInput, imagePaths: [] });

    expect(result.ok).toBe(false);
    expect(discardCapturedImage).toHaveBeenCalledWith("u1/first.jpg");
    expect(session.close).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    await scheduled[0]?.();
    expect(session.close).toHaveBeenCalled();
    expect(startProjectHighlights).not.toHaveBeenCalled();
  });

  it("does not open the project URL for someone else's project", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { update } = stubFrom({
      currentImagePaths: ["u2/shot.webp"],
      ownerId: "u2",
      updateRows: [],
    });

    const result = await editProject({ ...validInput, imagePaths: [] });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(PERMISSION_ERROR_REGEX);
    expect(captureProjectFirstScreen).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
