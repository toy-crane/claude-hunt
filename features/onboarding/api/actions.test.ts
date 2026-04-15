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

const { completeOnboarding } = await import("./actions");

const validInput = {
  displayName: "Alice",
  cohortId: COHORT_UUID,
};

function stubProfileUpsert(options: {
  upsertError?: { code?: string; message: string };
}) {
  const upsert = vi.fn().mockResolvedValue({
    data: null,
    error: options.upsertError ?? null,
  });
  from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return { upsert };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { upsert };
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
    const { upsert } = stubProfileUpsert({});

    await completeOnboarding(validInput);

    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects empty display name without touching the db", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("표시명을 입력해 주세요.");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only display name", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "   ",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("표시명을 입력해 주세요.");
  });

  it("rejects display name longer than 50 characters", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "a".repeat(51),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("표시명은 50자 이하로 입력해 주세요.");
  });

  it("rejects a missing/invalid cohort id", async () => {
    const result = await completeOnboarding({
      ...validInput,
      cohortId: "",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("기수를 선택해 주세요.");
  });

  it("upserts the caller's own profile with trimmed display name and cohort id", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "u1@example.com" } },
      error: null,
    });
    const { upsert } = stubProfileUpsert({});

    const result = await completeOnboarding({
      displayName: "  Alice  ",
      cohortId: COHORT_UUID,
    });

    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      {
        id: "u1",
        email: "u1@example.com",
        display_name: "Alice",
        cohort_id: COHORT_UUID,
      },
      { onConflict: "id" }
    );
  });

  it("surfaces a Supabase upsert error back to the caller", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "u1@example.com" } },
      error: null,
    });
    stubProfileUpsert({ upsertError: { message: "permission denied" } });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("permission denied");
  });

  it("maps the display-name unique violation to 'already taken'", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "u1@example.com" } },
      error: null,
    });
    stubProfileUpsert({
      upsertError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "profiles_display_name_ci_unique"',
      },
    });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("이미 사용 중인 표시명이에요.");
  });

  it("does NOT remap unrelated 23505 errors (other unique constraints pass through)", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "u1@example.com" } },
      error: null,
    });
    const rawMessage =
      'duplicate key value violates unique constraint "some_other_unique"';
    stubProfileUpsert({
      upsertError: { code: "23505", message: rawMessage },
    });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(rawMessage);
  });
});
