import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Radix UI primitives (e.g. Select) use pointer capture + scrollIntoView +
// ResizeObserver which jsdom does not implement. Stub them so component
// tests can open/close dropdowns like a real browser.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
  };
}
