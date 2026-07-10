import {
  DISPLAY_NAME_POLICY_MESSAGE,
  DISPLAY_NAME_REQUIRED_MESSAGE,
} from "@entities/profile";
import { createMockSupabaseClient } from "@shared/lib/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const COHORT_ID = "0f34e07e-3d4f-4bcb-9c31-2a1f4778a25e";

const updateMock = vi.fn().mockResolvedValue({ error: null });
const eqMock = vi.fn().mockResolvedValue({ error: null });

const mockClient = {
  ...createMockSupabaseClient(),
  from: vi.fn().mockReturnValue({
    update: updateMock,
  }),
};

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const refreshMock = vi.fn();
const updateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  refresh: refreshMock,
  updateTag: updateTagMock,
}));

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockReset();
    updateMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    vi.mocked(mockClient.auth.getClaims).mockResolvedValue({
      data: { claims: { sub: "user-1", email: "alice@example.com" } },
      error: null,
    });
  });

  it("updates only the display name when no cohort is provided", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "Alice_99" });

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice_99" });
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
    expect(updateTagMock).toHaveBeenCalledWith("projects");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("updates both the display name and the cohort when a cohort is provided", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({
      cohortId: COHORT_ID,
      displayName: "Alice_99",
    });

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({
      cohort_id: COHORT_ID,
      display_name: "Alice_99",
    });
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
  });

  it("rejects a non-uuid cohort id without calling update", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({
      cohortId: "not-a-uuid",
      displayName: "Alice",
    });

    expect(result).toEqual({
      ok: false,
      error: { field: "cohortId", message: "클래스를 선택해 주세요." },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("trims whitespace before persisting", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "  Alice  " });

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice" });
  });

  it("rejects an empty display name without calling update", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "" });

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: DISPLAY_NAME_REQUIRED_MESSAGE },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only display names with the same required message", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "   " });

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: DISPLAY_NAME_REQUIRED_MESSAGE },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects display names longer than 12 characters with the policy message", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "A".repeat(13) });

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: DISPLAY_NAME_POLICY_MESSAGE },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects display names with a special character", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "Alice!" });

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: DISPLAY_NAME_POLICY_MESSAGE },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("accepts underscore in display name", async () => {
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "Car_crash" });

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Car_crash" });
  });

  it("returns an auth error when no session exists", async () => {
    vi.mocked(mockClient.auth.getClaims).mockResolvedValue({
      data: null,
      error: null,
    });
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "Alice" });

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
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "Bob" });

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
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "Bob" });

    expect(result).toEqual({
      ok: false,
      error: { field: "displayName", message: rawMessage },
    });
  });

  it("self-save succeeds when the DB accepts the no-op update (Scenario 4)", async () => {
    // When the user saves their current display name, the unique index
    // sees no conflict (own row's own value) and the DB returns no error.
    eqMock.mockResolvedValue({ error: null });
    const { updateProfile } = await import("./actions");

    const result = await updateProfile({ displayName: "Alice" });

    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Alice" });
  });
});
