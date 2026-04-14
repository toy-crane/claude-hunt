import { render } from "@testing-library/react";
import { vi } from "vitest";
import Icon2, { contentType, IconElement, size } from "./icon2.tsx";

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

describe("app/icon2 (16x16 compact favicon)", () => {
  it("exports 16x16 size and PNG content type", () => {
    expect(size).toEqual({ width: 16, height: 16 });
    expect(contentType).toBe("image/png");
  });

  it("renders only the '_' glyph — no '>' prefix at this size", () => {
    const { container } = render(IconElement());
    expect(container.textContent).toContain("_");
    expect(container.textContent).not.toContain(">");
    expect(container.innerHTML).toContain(TERRACOTTA_RGB);
  });

  it("default export resolves without throwing", () => {
    expect(() => Icon2()).not.toThrow();
  });
});
