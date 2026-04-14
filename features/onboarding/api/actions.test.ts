import { beforeEach, describe, expect, it, vi } from "vitest";

const SIGNED_IN_REGEX = /signed in/i;
const COHORT_UUID = "a1b2c3d4-5678-4abc-9def-0123456789ab";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getUser = vi.fn();
const from = vi.fn();
const mockClient = {
  auth: { getUser },
  from,
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

const { completeOnboarding } = await import("./actions.ts");

const validInput = {
  displayName: "Alice",
  cohortId: COHORT_UUID,
};

function stubProfileUpdate(options: { updateError?: { message: string } }) {
  const eq = vi.fn().mockResolvedValue({
    data: null,
    error: options.updateError ?? null,
  });
  const update = vi.fn().mockReturnValue({ eq });
  from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return { update };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { update, eq };
}

beforeEach(() => {
  revalidatePathMock.mockClear();
  getUser.mockReset();
  from.mockReset();
});

describe("completeOnboarding server action", () => {
  it("rejects when the user is not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(SIGNED_IN_REGEX);
  });

  it("does not touch the database when the caller is signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { update } = stubProfileUpdate({});

    await completeOnboarding(validInput);

    expect(update).not.toHaveBeenCalled();
  });

  it("rejects empty display name without touching the db", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Display name is required");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only display name", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "   ",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Display name is required");
  });

  it("rejects display name longer than 50 characters", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "a".repeat(51),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Display name must be 50 characters or fewer");
  });

  it("rejects a missing/invalid cohort id", async () => {
    const result = await completeOnboarding({
      ...validInput,
      cohortId: "",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Please select a cohort");
  });

  it("updates the caller's own profile with trimmed display name and cohort id", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const { update, eq } = stubProfileUpdate({});

    const result = await completeOnboarding({
      displayName: "  Alice  ",
      cohortId: COHORT_UUID,
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      display_name: "Alice",
      cohort_id: COHORT_UUID,
    });
    expect(eq).toHaveBeenCalledWith("id", "u1");
  });

  it("surfaces a Supabase update error back to the caller", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    stubProfileUpdate({ updateError: { message: "permission denied" } });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("permission denied");
  });
});
