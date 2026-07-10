import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ImageSlot } from "./image-slots";

// image-slots.tsx pulls in validateScreenshotFile, whose module also
// exports uploadScreenshot — that one touches the Supabase browser client,
// which reads env vars this test doesn't set. Stub it out at import time,
// matching shared/lib/screenshot-upload.test.ts's convention.
vi.mock("@shared/api/supabase/client.ts", () => ({
  createBrowserClient: () => ({}),
}));

const { ImageSlots } = await import("./image-slots");

function makeSlot(id: string): ImageSlot {
  return {
    id,
    file: new File(["x"], `${id}.png`, { type: "image/png" }),
    preview: `blob:${id}`,
  };
}

describe("ImageSlots", () => {
  it("keeps the 대표 이미지 제거 accessible name on the primary remove button", () => {
    const slots = [makeSlot("a"), makeSlot("b")];
    render(<ImageSlots onChange={vi.fn()} value={slots} />);

    expect(
      screen.getByRole("button", { name: "대표 이미지 제거" })
    ).toBeInTheDocument();
  });

  it("removes a thumbnail without touching the primary slot", async () => {
    const slots = [makeSlot("a"), makeSlot("b"), makeSlot("c")];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ImageSlots onChange={onChange} value={slots} />);

    await user.click(
      screen.getAllByRole("button", { name: "썸네일 이미지 제거" })[0]
    );

    expect(onChange).toHaveBeenCalledWith([slots[0], slots[2]]);
  });

  it("promotes the next thumbnail to primary when the primary slot is removed", async () => {
    const slots = [makeSlot("a"), makeSlot("b"), makeSlot("c")];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ImageSlots onChange={onChange} value={slots} />);

    await user.click(screen.getByRole("button", { name: "대표 이미지 제거" }));

    expect(onChange).toHaveBeenCalledWith([slots[1], slots[2]]);
  });

  it("disables the remove buttons when disabled", () => {
    const slots = [makeSlot("a"), makeSlot("b")];
    render(<ImageSlots disabled onChange={vi.fn()} value={slots} />);

    expect(
      screen.getByRole("button", { name: "대표 이미지 제거" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "썸네일 이미지 제거" })
    ).toBeDisabled();
  });
});
