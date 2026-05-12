import { describe, expect, it } from "vitest";

import {
  DISPLAY_NAME_POLICY_MESSAGE,
  DISPLAY_NAME_REQUIRED_MESSAGE,
  displayNameSchema,
} from "./display-name-schema";

describe("displayNameSchema", () => {
  describe("accepts values that satisfy the policy", () => {
    it.each([
      "Alice_99",
      "토이크레인",
      "Hi",
      "abcdefghijkl",
      "Car_crash",
      "JK헨리",
      "23",
    ])("accepts %j", (value) => {
      const result = displayNameSchema.safeParse(value);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(value);
      }
    });

    it("trims leading and trailing whitespace before validating", () => {
      const result = displayNameSchema.safeParse("  Alice  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("Alice");
      }
    });
  });

  describe("rejects empty input with the required message", () => {
    it.each([
      "",
      "   ",
      "\t\n",
    ])("rejects %j with the required message", (value) => {
      const result = displayNameSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          DISPLAY_NAME_REQUIRED_MESSAGE
        );
      }
    });
  });

  describe("rejects values that violate the character or length rules", () => {
    it.each([
      ["a", "single character"],
      ["abcdefghijklm", "thirteen characters"],
      ["Alice!", "special character"],
      ["Alice K", "inner whitespace"],
      ["ㄱㄴ", "standalone jamo"],
      ["ㅏㅓ", "standalone vowels"],
      ["Alice@example", "@ symbol"],
      ["alice-99", "hyphen"],
      ["alice.99", "period"],
      ["alice 99", "inner space"],
    ])("rejects %j (%s) with the policy message", (value) => {
      const result = displayNameSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          DISPLAY_NAME_POLICY_MESSAGE
        );
      }
    });
  });
});
