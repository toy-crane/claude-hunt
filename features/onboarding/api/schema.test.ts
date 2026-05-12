import {
  DISPLAY_NAME_POLICY_MESSAGE,
  DISPLAY_NAME_REQUIRED_MESSAGE,
} from "@entities/profile";
import { describe, expect, it } from "vitest";

import { onboardingInputSchema } from "./schema";

const validUuid = "a1b2c3d4-5678-4abc-9def-0123456789ab";

describe("onboardingInputSchema", () => {
  it("accepts a valid display name + cohort id", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "Alice",
      cohortId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Alice");
    }
  });

  it("trims surrounding whitespace on display name", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "  Alice  ",
      cohortId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Alice");
    }
  });

  it("rejects an empty display name with the required message", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "",
      cohortId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        DISPLAY_NAME_REQUIRED_MESSAGE
      );
    }
  });

  it("rejects a whitespace-only display name with the required message", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "   ",
      cohortId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        DISPLAY_NAME_REQUIRED_MESSAGE
      );
    }
  });

  it("rejects a 13-character display name with the policy message", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "abcdefghijklm",
      cohortId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(DISPLAY_NAME_POLICY_MESSAGE);
    }
  });

  it("rejects a display name containing a special character", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "Alice!",
      cohortId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(DISPLAY_NAME_POLICY_MESSAGE);
    }
  });

  it("accepts a display name of exactly 12 characters", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "abcdefghijkl",
      cohortId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts underscore in the display name", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "Car_crash",
      cohortId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing cohort id", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "Alice",
      cohortId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("클래스를 선택해 주세요.");
    }
  });

  it("rejects a non-uuid cohort id", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "Alice",
      cohortId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("클래스를 선택해 주세요.");
    }
  });
});
