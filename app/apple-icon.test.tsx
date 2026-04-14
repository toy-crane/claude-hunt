import { render } from "@testing-library/react";
import { vi } from "vitest";
import AppleIcon, { contentType, IconElement, size } from "./apple-icon.tsx";

vi.mock("next/og", () => ({
  ImageResponse: class {
    element: unknown;
    opts: unknown;
    constructor(element: unknown, opts: unknown) {
      this.element = element;
      this.opts = opts;
    }
  },
}));

const TERRACOTTA_RGB = "rgb(193, 95, 60)";

describe("app/apple-icon (180x180)", () => {
  it("exports 180x180 size and PNG content type", () => {
    expect(size).toEqual({ width: 180, height: 180 });
    expect(contentType).toBe("image/png");
  });

  it("renders the full '> claude-hunt_' wordmark at this larger size", () => {
    const { container } = render(IconElement());
    const text = container.textContent ?? "";
    // Parts may be split across spans; assert each chunk is present.
    expect(text).toContain(">");
    expect(text).toContain("claude-hunt");
    expect(text).toContain("_");
    expect(container.innerHTML).toContain(TERRACOTTA_RGB);
  });

  it("default export resolves without throwing", () => {
    expect(() => AppleIcon()).not.toThrow();
  });
});
