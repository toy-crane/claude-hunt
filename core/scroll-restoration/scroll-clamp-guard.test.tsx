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

  it("keeps the extension alive when scroll events arrive before the timeout", () => {
    vi.useFakeTimers();
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    scrollHeight = 1200;
    fireTraversal();
    expect(document.body.style.minHeight).toBe("25000px");

    fireScroll();
    vi.advanceTimersByTime(1000);
    fireScroll();

    expect(document.body.style.minHeight).toBe("25000px");
  });

  it("does not record the inflated height while an extension is active", () => {
    vi.useFakeTimers();
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    scrollHeight = 1200;
    fireTraversal();

    // 연장 중 scroll은 기록을 남기지 않아야, 짧은 페이지 URL로 이동한 뒤의
    // 트래버설이 부풀려진 높이로 연장되지 않는다.
    window.history.replaceState({}, "", "/detail");
    fireScroll();
    vi.advanceTimersByTime(3000);
    fireTraversal();

    expect(document.body.style.minHeight).toBe("");
  });

  it("releases the extension after the timeout", () => {
    vi.useFakeTimers();
    render(<ScrollClampGuard />);
    scrollHeight = 25_000;
    fireScroll();
    scrollHeight = 1200;
    fireTraversal();
    expect(document.body.style.minHeight).toBe("25000px");

    vi.advanceTimersByTime(3000);

    expect(document.body.style.minHeight).toBe("");
  });

  it("supersedes a previous extension when a new traversal arrives", () => {
    vi.useFakeTimers();
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

    vi.advanceTimersByTime(2000);
    window.history.replaceState({}, "", "/detail");
    fireTraversal();
    expect(document.body.style.minHeight).toBe("30000px");

    // 이전 연장의 남은 타이머(1초 뒤)가 새 연장을 풀지 않아야 한다.
    vi.advanceTimersByTime(1000);
    expect(document.body.style.minHeight).toBe("30000px");

    vi.advanceTimersByTime(2000);
    expect(document.body.style.minHeight).toBe("");
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
