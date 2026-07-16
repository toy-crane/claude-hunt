import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroEntrance } from "./hero-entrance";

const FLAG_KEY = "ch:just-submitted:p1";

// jsdom ships neither the Web Animations API nor matchMedia; both are
// stubbed per test and removed again so other cases exercise the
// component's own feature-detection guards.
const animateSpy = vi.fn();

function stubAnimate() {
  Element.prototype.animate =
    animateSpy as unknown as typeof Element.prototype.animate;
}

function stubReducedMotion(matches: boolean) {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  animateSpy.mockReset();
  Reflect.deleteProperty(Element.prototype, "animate");
  Reflect.deleteProperty(window, "matchMedia");
});

function renderWithBlocks() {
  return render(
    <HeroEntrance projectId="p1">
      <div data-testid="block-1" />
      <div data-testid="block-2" />
      <div data-testid="block-3" />
    </HeroEntrance>
  );
}

describe("<HeroEntrance />", () => {
  it("plays the staggered entrance once when the project was just submitted", () => {
    stubAnimate();
    window.sessionStorage.setItem(FLAG_KEY, "1");

    renderWithBlocks();

    expect(animateSpy).toHaveBeenCalledTimes(3);
    const delays = animateSpy.mock.calls.map(
      (call) => (call[1] as KeyframeAnimationOptions).delay
    );
    expect(delays).toEqual([0, 60, 120]);
    // The flag is consumed, so a refresh or revisit stays static.
    expect(window.sessionStorage.getItem(FLAG_KEY)).toBeNull();
  });

  it("does nothing on a normal visit", () => {
    stubAnimate();

    renderWithBlocks();

    expect(animateSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("block-1")).toBeInTheDocument();
  });

  it("falls back to an opacity-only fade with no stagger under reduced motion", () => {
    stubAnimate();
    stubReducedMotion(true);
    window.sessionStorage.setItem(FLAG_KEY, "1");

    renderWithBlocks();

    expect(animateSpy).toHaveBeenCalledTimes(3);
    for (const call of animateSpy.mock.calls) {
      const keyframes = call[0] as Keyframe[];
      for (const frame of keyframes) {
        expect(frame).not.toHaveProperty("transform");
      }
      expect((call[1] as KeyframeAnimationOptions).delay).toBe(0);
    }
  });

  it("renders safely where the Web Animations API is unavailable", () => {
    window.sessionStorage.setItem(FLAG_KEY, "1");

    renderWithBlocks();

    expect(screen.getByTestId("block-3")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(FLAG_KEY)).toBeNull();
  });
});
