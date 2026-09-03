import { EMAIL_MARKETING_CONSENT_VERSION } from "@entities/email-marketing-consent";
import {
  DISPLAY_NAME_POLICY_MESSAGE,
  DISPLAY_NAME_REQUIRED_MESSAGE,
} from "@entities/profile";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SIGNED_IN_REGEX = /로그인/;
const COHORT_UUID = "a1b2c3d4-5678-4abc-9def-0123456789ab";

const revalidatePathMock = vi.fn();
const updateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}));

const getClaims = vi.fn();
const rpc = vi.fn();
const mockClient = {
  auth: { getClaims },
  rpc,
};

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const { completeOnboarding } = await import("./actions");

const validInput = {
  displayName: "Alice",
  cohortId: COHORT_UUID,
};

function stubCompleteOnboarding(options: {
  rpcError?: { code?: string; message: string };
}) {
  rpc.mockResolvedValue({
    data: null,
    error: options.rpcError ?? null,
  });
}

beforeEach(() => {
  revalidatePathMock.mockClear();
  updateTagMock.mockClear();
  getClaims.mockReset();
  rpc.mockReset();
});

describe("completeOnboarding server action", () => {
  it("rejects when the user is not signed in", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(SIGNED_IN_REGEX);
  });

  it("does not touch the database when the caller is signed out", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    stubCompleteOnboarding({});

    await completeOnboarding(validInput);

    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects empty display name without touching the db", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(DISPLAY_NAME_REQUIRED_MESSAGE);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only display name", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "   ",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(DISPLAY_NAME_REQUIRED_MESSAGE);
  });

  it("rejects display name longer than 12 characters with the policy message", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "a".repeat(13),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(DISPLAY_NAME_POLICY_MESSAGE);
  });

  it("rejects display name containing a special character", async () => {
    const result = await completeOnboarding({
      ...validInput,
      displayName: "Alice!",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(DISPLAY_NAME_POLICY_MESSAGE);
  });

  it("accepts underscore in display name", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "u1@example.com" } },
      error: null,
    });
    stubCompleteOnboarding({});

    const result = await completeOnboarding({
      ...validInput,
      displayName: "Car_crash",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a missing/invalid cohort id", async () => {
    const result = await completeOnboarding({
      ...validInput,
      cohortId: "",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("클래스를 선택해 주세요.");
  });

  it("atomically saves the profile and unchecked marketing choice", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "u1@example.com" } },
      error: null,
    });
    stubCompleteOnboarding({});

    const result = await completeOnboarding({
      displayName: "  Alice  ",
      cohortId: COHORT_UUID,
    });

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("complete_onboarding", {
      p_cohort_id: COHORT_UUID,
      p_consent_version: EMAIL_MARKETING_CONSENT_VERSION,
      p_display_name: "Alice",
      p_marketing_opted_in: false,
    });
  });

  it("saves checked marketing consent with the current copy version", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "u1@example.com" } },
      error: null,
    });
    stubCompleteOnboarding({});

    const result = await completeOnboarding({
      ...validInput,
      marketingOptedIn: true,
    });

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("complete_onboarding", {
      p_cohort_id: COHORT_UUID,
      p_consent_version: EMAIL_MARKETING_CONSENT_VERSION,
      p_display_name: "Alice",
      p_marketing_opted_in: true,
    });
  });

  it("surfaces a Supabase upsert error back to the caller", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "u1@example.com" } },
      error: null,
    });
    stubCompleteOnboarding({ rpcError: { message: "permission denied" } });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("permission denied");
  });

  it("maps the display-name unique violation to 'already taken'", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "u1@example.com" } },
      error: null,
    });
    stubCompleteOnboarding({
      rpcError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "profiles_display_name_ci_unique"',
      },
    });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("이미 사용 중인 닉네임이에요.");
  });

  it("does NOT remap unrelated 23505 errors (other unique constraints pass through)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "u1@example.com" } },
      error: null,
    });
    const rawMessage =
      'duplicate key value violates unique constraint "some_other_unique"';
    stubCompleteOnboarding({
      rpcError: { code: "23505", message: rawMessage },
    });

    const result = await completeOnboarding(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(rawMessage);
  });
});
