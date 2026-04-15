import { createMockSupabaseClient } from "@shared/lib/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn().mockResolvedValue({ error: null });
const eqMock = vi.fn().mockResolvedValue({ error: null });

const mockClient = {
  ...createMockSupabaseClient(),
  from: vi.fn().mockReturnValue({
    update: updateMock,
  }),
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

describe("updateDisplayName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockReset();
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    vi.mocked(mockClient.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1", email: "alice@example.com" } },
      error: null,
    });
  });

  it("updates the profile row and revalidates / on a valid input", async () => {
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("Alice K.");

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice K." });
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  it("trims whitespace before persisting", async () => {
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("  Alice K.  ");

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice K." });
  });

  it("rejects an empty display name without calling update", async () => {
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("");

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: "닉네임을 입력해 주세요." },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only display names with the same required message", async () => {
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("   ");

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: "닉네임을 입력해 주세요." },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects display names longer than 50 characters", async () => {
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("A".repeat(51));

    expect(result).toEqual({
      ok: false,
      error: {
        field: "displayName",
        message: "닉네임은 50자 이하로 입력해 주세요.",
      },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns an auth error when no session exists", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("Alice");

    expect(result.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("maps the display-name unique violation to 'already taken'", async () => {
    eqMock.mockResolvedValue({
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "profiles_display_name_ci_unique"',
      },
    });
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("Bob");

    expect(result).toEqual({
      ok: false,
      error: {
        field: "displayName",
        message: "이미 사용 중인 닉네임이에요.",
      },
    });
  });

  it("does NOT remap unrelated 23505 errors (other unique constraints pass through)", async () => {
    const rawMessage =
      'duplicate key value violates unique constraint "some_other_unique"';
    eqMock.mockResolvedValue({
      error: { code: "23505", message: rawMessage },
    });
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("Bob");

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: rawMessage },
    });
  });

  it("self-save succeeds when the DB accepts the no-op update (Scenario 4)", async () => {
    // When the user saves their current display name, the unique index
    // sees no conflict (own row's own value) and the DB returns no error.
    eqMock.mockResolvedValue({ error: null });
    const { updateDisplayName } = await import("./actions");

    const result = await updateDisplayName("Alice");

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice" });
  });
});
