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
const TERRACOTTA_RGB = "rgb(193, 95, 60)";

describe("app/icon", () => {
  it("exports 32x32 size and PNG content type", () => {
    expect(size).toEqual({ width: 32, height: 32 });
    expect(contentType).toBe("image/png");
  });

  it("renders the '_' glyph on a terracotta fill", () => {
    const { container } = render(IconElement());
    expect(container.textContent).toContain("_");
    // jsdom normalizes hex to rgb() in inline style; match that form.
    expect(container.innerHTML).toContain(TERRACOTTA_RGB);
  });

  it("default export resolves without throwing", () => {
    expect(() => Icon()).not.toThrow();
  });
});
