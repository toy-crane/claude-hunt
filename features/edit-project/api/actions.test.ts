import { beforeEach, describe, expect, it, vi } from "vitest";

const PERMISSION_ERROR_REGEX = /permission/;

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

const { editProject } = await import("./actions.ts");

const validInput = {
  projectId: "11111111-1111-1111-1111-111111111111",
  title: "Edited Title",
  tagline: "Edited tagline",
  projectUrl: "https://edited.example.com",
};

beforeEach(() => {
  revalidatePathMock.mockClear();
  getUser.mockReset();
  from.mockReset();
});

function stubUpdateResult(options: {
  rows?: Array<{ id: string }>;
  error?: { message: string };
}) {
  const select = vi.fn().mockResolvedValue({
    data: options.rows ?? [],
    error: options.error ?? null,
  });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ update });
  return { update, eq, select };
}

describe("editProject server action", () => {
  it("rejects when the user is not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await editProject(validInput);

    expect(result.ok).toBe(false);
  });

  it("updates the project and revalidates the home page on success", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { update, eq } = stubUpdateResult({
      rows: [{ id: validInput.projectId }],
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
    expect(eq).toHaveBeenCalledWith("id", validInput.projectId);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("reports forbidden when RLS returns zero rows (spoofed projectId)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubUpdateResult({ rows: [] });

    const result = await editProject(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(PERMISSION_ERROR_REGEX);
  });

  it("includes screenshot_path in the update when supplied", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { update } = stubUpdateResult({
      rows: [{ id: validInput.projectId }],
    });

    await editProject({
      ...validInput,
      screenshotPath: "u1/new-shot.png",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ screenshot_path: "u1/new-shot.png" })
    );
  });
});
