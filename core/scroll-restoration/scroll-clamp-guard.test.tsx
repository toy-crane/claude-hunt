import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ScrollClampGuard } from "./scroll-clamp-guard";

let scrollHeight = 0;

beforeAll(() => {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.style.minHeight = "";
  scrollHeight = 0;
  window.history.replaceState({}, "", "/");
});

const fireScroll = () => window.dispatchEvent(new Event("scroll"));
const fireTraversal = () => window.dispatchEvent(new PopStateEvent("popstate"));

describe("ScrollClampGuard", () => {
  it("extends the body to the recorded height when traversing back to a taller page", () => {
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();

    scrollHeight = 1200;
    fireTraversal();

    expect(document.body.style.minHeight).toBe("25000px");
  });

  it("leaves the body alone when the current document is already tall enough", () => {
    render(<ScrollClampGuard />);
    scrollHeight = 1200;
    fireScroll();

    scrollHeight = 25_000;
    fireTraversal();

    expect(document.body.style.minHeight).toBe("");
  });

  it("leaves the body alone when traversing to a page that was never measured", () => {
    render(<ScrollClampGuard />);

    scrollHeight = 1200;
    fireTraversal();

    expect(document.body.style.minHeight).toBe("");
  });

  it("keys recorded heights by URL so another page's record does not extend the body", () => {
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    window.history.pushState({}, "", "/detail");

    scrollHeight = 1200;
    fireTraversal();

    expect(document.body.style.minHeight).toBe("");
  });

  it("releases the extension two frames after the restore scroll arrives", () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    scrollHeight = 1200;
    fireTraversal();
    expect(document.body.style.minHeight).toBe("25000px");

    fireScroll();

    expect(document.body.style.minHeight).toBe("");
  });

  it("releases the extension after a timeout when no restore scroll arrives", () => {
    vi.useFakeTimers();
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    scrollHeight = 1200;
    fireTraversal();
    expect(document.body.style.minHeight).toBe("25000px");

    vi.advanceTimersByTime(2000);

    expect(document.body.style.minHeight).toBe("");
  });

  it("keeps a newer extension alive when the previous release chain fires late", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    const flushFrames = () => {
      for (const cb of frames.splice(0)) {
        cb(0);
      }
    };
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    window.history.pushState({}, "", "/detail");
    scrollHeight = 30_000;
    fireScroll();

    scrollHeight = 1200;
    window.history.replaceState({}, "", "/");
    fireTraversal();
    expect(document.body.style.minHeight).toBe("25000px");
    fireScroll();

    window.history.replaceState({}, "", "/detail");
    fireTraversal();
    expect(document.body.style.minHeight).toBe("30000px");

    flushFrames();
    flushFrames();

    expect(document.body.style.minHeight).toBe("30000px");
  });

  it("releases the extension when the guard unmounts", () => {
    const { unmount } = render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    scrollHeight = 1200;
    fireTraversal();
    expect(document.body.style.minHeight).toBe("25000px");

    unmount();

    expect(document.body.style.minHeight).toBe("");
  });
});
