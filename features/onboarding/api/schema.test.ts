import { describe, expect, it } from "vitest";
import { onboardingInputSchema } from "./schema.ts";

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

  it("rejects an empty display name", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "",
      cohortId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Display name is required");
    }
  });

  it("rejects a whitespace-only display name after trim", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "   ",
      cohortId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Display name is required");
    }
  });

  it("rejects a display name longer than 50 characters", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "a".repeat(51),
      cohortId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Display name must be 50 characters or fewer"
      );
    }
  });

  it("accepts a display name of exactly 50 characters", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "a".repeat(50),
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
      expect(result.error.issues[0]?.message).toBe("Please select a cohort");
    }
  });

  it("rejects a non-uuid cohort id", () => {
    const result = onboardingInputSchema.safeParse({
      displayName: "Alice",
      cohortId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Please select a cohort");
    }
  });
});
