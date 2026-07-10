import { describe, expect, it } from "vitest";
import { promoteToPrimary } from "./promote";

describe("promoteToPrimary", () => {
  const slots = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("moves the target slot to the front and keeps the relative order of the rest", () => {
    expect(promoteToPrimary(slots, "c")).toEqual([
      { id: "c" },
      { id: "a" },
      { id: "b" },
      { id: "d" },
    ]);
  });

  it("preserves object identity of every slot", () => {
    const result = promoteToPrimary(slots, "c");
    expect(result[0]).toBe(slots[2]);
    expect(result[1]).toBe(slots[0]);
    expect(result[2]).toBe(slots[1]);
    expect(result[3]).toBe(slots[3]);
  });

  it("returns the same array when the id is already primary", () => {
    expect(promoteToPrimary(slots, "a")).toBe(slots);
  });

  it("returns the same array when the id does not exist", () => {
    expect(promoteToPrimary(slots, "zzz")).toBe(slots);
  });

  it("does not mutate the input array", () => {
    promoteToPrimary(slots, "d");
    expect(slots.map((slot) => slot.id)).toEqual(["a", "b", "c", "d"]);
  });
});
