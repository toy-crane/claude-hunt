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

const INK_RGB = "rgb(26, 21, 18)";
const WHITE_RGB = "rgb(255, 255, 255)";

describe("app/icon2 (16x16 compact favicon)", () => {
  it("exports 16x16 size and PNG content type", () => {
    expect(size).toEqual({ width: 16, height: 16 });
    expect(contentType).toBe("image/png");
  });

  it("renders the '>' prompt glyph in white on an ink-colored square (monochrome)", () => {
    const { container } = render(IconElement());
    expect(container.textContent).toContain(">");
    expect(container.textContent).not.toContain("_");
    expect(container.innerHTML).toContain(INK_RGB);
    expect(container.innerHTML).toContain(WHITE_RGB);
  });

  it("default export resolves without throwing", () => {
    expect(() => Icon2()).not.toThrow();
  });
});
