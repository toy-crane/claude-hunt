import { render } from "@testing-library/react";
import { vi } from "vitest";
import OpenGraphImage, {
  alt,
  contentType,
  OgElement,
  size,
} from "./opengraph-image.tsx";

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

describe("app/opengraph-image (1200x630)", () => {
  it("exports 1200x630 size and PNG content type", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("declares an alt text that names the product", () => {
    expect(alt.toLowerCase()).toContain("claude-hunt");
  });

  it("renders the full '> claude-hunt_' wordmark", () => {
    const { container } = render(OgElement());
    const text = container.textContent ?? "";
    expect(text).toContain(">");
    expect(text).toContain("claude-hunt");
    expect(text).toContain("_");
  });

  it("applies terracotta to the '>' and '_' glyphs", () => {
    const { container } = render(OgElement());
    // Find the `>` and `_` spans; verify their inline color is terracotta.
    const spans = Array.from(container.querySelectorAll("span"));
    const promptSpan = spans.find((s) => s.textContent === ">");
    const cursorSpan = spans.find((s) => s.textContent === "_");
    expect(promptSpan?.style.color).toBe(TERRACOTTA_RGB);
    expect(cursorSpan?.style.color).toBe(TERRACOTTA_RGB);
  });

  it("default export resolves without throwing", () => {
    expect(() => OpenGraphImage()).not.toThrow();
  });
});
