import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankDot } from "./rank-badge";

describe("RankDot", () => {
  it("renders nothing for ranks outside 1–3", () => {
    const { container: zero } = render(<RankDot rank={0} />);
    expect(zero.firstChild).toBeNull();

    const { container: four } = render(<RankDot rank={4} />);
    expect(four.firstChild).toBeNull();

    const { container: hundred } = render(<RankDot rank={100} />);
    expect(hundred.firstChild).toBeNull();
  });

  it("renders an amber dot for rank 1 in light, bright amber in dark", () => {
    render(<RankDot rank={1} />);
    const dot = screen.getByTestId("rank-dot");
    expect(dot.className).toContain("bg-amber-500");
    expect(dot.className).toContain("dark:bg-amber-400");
    expect(dot).toHaveAttribute("data-rank", "1");
  });

  it("renders a zinc dot for rank 2", () => {
    render(<RankDot rank={2} />);
    const dot = screen.getByTestId("rank-dot");
    expect(dot.className).toContain("bg-zinc-400");
    expect(dot).toHaveAttribute("data-rank", "2");
  });

  it("renders an orange dot for rank 3 in light, warmer orange in dark", () => {
    render(<RankDot rank={3} />);
    const dot = screen.getByTestId("rank-dot");
    expect(dot.className).toContain("bg-orange-700");
    expect(dot.className).toContain("dark:bg-orange-400");
    expect(dot).toHaveAttribute("data-rank", "3");
  });

  it("does not render any text label (no '1st', '2nd', '3rd')", () => {
    const { container } = render(<RankDot rank={1} />);
    expect(container.textContent).toBe("");
  });

  it("is a 6 px round element (size-1.5 rounded-full)", () => {
    render(<RankDot rank={1} />);
    const dot = screen.getByTestId("rank-dot");
    expect(dot.className).toContain("size-1.5");
    expect(dot.className).toContain("rounded-full");
  });
});
