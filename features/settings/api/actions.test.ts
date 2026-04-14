import { createMockSupabaseClient } from "@shared/lib/test-utils.tsx";
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
    const { updateDisplayName } = await import("./actions.ts");

    const result = await updateDisplayName("Alice K.");

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice K." });
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  it("trims whitespace before persisting", async () => {
    const { updateDisplayName } = await import("./actions.ts");

    const result = await updateDisplayName("  Alice K.  ");

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice K." });
  });

  it("rejects an empty display name without calling update", async () => {
    const { updateDisplayName } = await import("./actions.ts");

    const result = await updateDisplayName("");

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: "Display name is required" },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only display names with the same required message", async () => {
    const { updateDisplayName } = await import("./actions.ts");

    const result = await updateDisplayName("   ");

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: "Display name is required" },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects display names longer than 50 characters", async () => {
    const { updateDisplayName } = await import("./actions.ts");

    const result = await updateDisplayName("A".repeat(51));

    expect(result).toEqual({
      ok: false,
      error: {
        field: "displayName",
        message: "Display name must be 50 characters or fewer",
      },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns an auth error when no session exists", async () => {
    vi.mocked(mockClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { updateDisplayName } = await import("./actions.ts");

    const result = await updateDisplayName("Alice");

    expect(result.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
