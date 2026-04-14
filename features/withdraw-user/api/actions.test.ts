import { beforeEach, describe, expect, it, vi } from "vitest";

const SIGNED_IN_REGEX = /signed in/i;

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getUser = vi.fn();
const signOut = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn();
const storageRemove = vi.fn().mockResolvedValue({ data: [], error: null });
const storageFrom = vi.fn().mockReturnValue({ remove: storageRemove });
const userClient = {
  auth: { getUser, signOut },
  from,
  storage: { from: storageFrom },
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(userClient),
}));

const deleteUser = vi.fn();
const adminClient = {
  auth: { admin: { deleteUser } },
};

vi.mock("@shared/api/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(adminClient),
}));

const { withdrawAccount } = await import("./actions");

function stubProjects(
  rows: Array<{ screenshot_path: string | null }>,
  error: { message: string } | null = null
) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValueOnce({ select });
  return { eq, select };
}

beforeEach(() => {
  revalidatePathMock.mockClear();
  storageRemove.mockClear();
  storageFrom.mockClear();
  signOut.mockClear();
  deleteUser.mockReset();
  deleteUser.mockResolvedValue({ data: null, error: null });
  getUser.mockReset();
  from.mockReset();
});

describe("withdrawAccount server action", () => {
  it("rejects signed-out callers and never calls admin.deleteUser", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await withdrawAccount();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(SIGNED_IN_REGEX);
    }
    expect(deleteUser).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("removes screenshots, deletes the auth user, then signs out (happy path)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    stubProjects([
      { screenshot_path: "u1/a.png" },
      { screenshot_path: "u1/b.png" },
    ]);

    const result = await withdrawAccount();

    expect(result.ok).toBe(true);
    expect(storageFrom).toHaveBeenCalledWith("project-screenshots");
    expect(storageRemove).toHaveBeenCalledWith(["u1/a.png", "u1/b.png"]);
    expect(deleteUser).toHaveBeenCalledWith("u1");
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("skips storage.remove when the user has no projects", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    stubProjects([]);

    const result = await withdrawAccount();

    expect(result.ok).toBe(true);
    expect(storageRemove).not.toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith("u2");
  });

  it("returns an error and does not sign out when admin.deleteUser fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u3" } }, error: null });
    stubProjects([{ screenshot_path: "u3/s.png" }]);
    deleteUser.mockResolvedValueOnce({
      data: null,
      error: { message: "supabase down" },
    });

    const result = await withdrawAccount();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("supabase down");
    }
    expect(signOut).not.toHaveBeenCalled();
  });

  it("sources the user id from the session, ignoring any stray arguments", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "session-user" } },
      error: null,
    });
    stubProjects([]);

    // Caller tries to pass a foreign id; action must ignore it.
    await (withdrawAccount as unknown as (id: string) => Promise<unknown>)(
      "someone-else"
    );

    expect(deleteUser).toHaveBeenCalledWith("session-user");
    expect(deleteUser).not.toHaveBeenCalledWith("someone-else");
  });
});
