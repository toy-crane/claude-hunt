import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// A mutable flag the mocked useReducedMotion reads, so individual tests can
// switch between the plain (reduced) and animated paths.
const { motionState } = vi.hoisted(() => ({
  motionState: { reduce: true },
}));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionState.reduce,
}));

import { RollingCount } from "./rolling-count";

afterEach(() => {
  motionState.reduce = true;
});

describe("RollingCount (reduced motion)", () => {
  it("renders the current value as a single text node", () => {
    const { container } = render(<RollingCount value={42} />);
    expect(screen.getAllByText("42")).toHaveLength(1);
    expect(container.textContent).toBe("42");
  });

  it("keeps only the current value when it changes — no stale digits linger", () => {
    const { container, rerender } = render(<RollingCount value={128} />);
    expect(container.textContent).toBe("128");

    rerender(<RollingCount value={129} />);
    expect(screen.getAllByText("129")).toHaveLength(1);
    expect(container.textContent).toBe("129");
  });

  it("forwards extra class names to the count", () => {
    render(<RollingCount className="tabular-nums" value={7} />);
    expect(screen.getByText("7").className).toContain("tabular-nums");
  });
});

describe("RollingCount (motion enabled)", () => {
  it("shows the current value and updates it on increase", () => {
    motionState.reduce = false;
    const { container, rerender } = render(<RollingCount value={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();

    rerender(<RollingCount value={6} />);
    expect(container.textContent).toContain("6");
  });

  it("updates the value on decrease", () => {
    motionState.reduce = false;
    const { container, rerender } = render(<RollingCount value={6} />);
    rerender(<RollingCount value={5} />);
    expect(container.textContent).toContain("5");
  });
});
