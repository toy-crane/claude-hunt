import { render } from "@testing-library/react";
import { vi } from "vitest";
import Icon, { contentType, IconElement, size } from "./icon.tsx";

// Stub next/og — the real ImageResponse requires an edge runtime.
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

// jsdom serializes hex colors to rgb(...) in computed styles.
const INK_RGB = "rgb(26, 21, 18)";
const WHITE_RGB = "rgb(255, 255, 255)";

describe("app/icon", () => {
  it("exports 32x32 size and PNG content type", () => {
    expect(size).toEqual({ width: 32, height: 32 });
    expect(contentType).toBe("image/png");
  });

  it("renders the '>' prompt glyph in white on an ink-colored square", () => {
    const { container } = render(IconElement());
    expect(container.textContent).toContain(">");
    expect(container.textContent).not.toContain("_");
    // background is near-black ink, text is white — pure monochrome.
    expect(container.innerHTML).toContain(INK_RGB);
    expect(container.innerHTML).toContain(WHITE_RGB);
  });

  it("default export resolves without throwing", () => {
    expect(() => Icon()).not.toThrow();
  });
});
