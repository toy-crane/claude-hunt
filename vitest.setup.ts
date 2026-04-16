import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { vi } from "vitest";

// React's `<ViewTransition>` is bundled into Next.js's internal React canary
// but is not exported from the top-level `react` package that vitest resolves
// in node_modules. Substitute a transparent passthrough so components that
// use `<ViewTransition>` for view-transition animation still render in tests.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    ViewTransition: ({ children }: { children: ReactNode }) => children,
  };
});

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
