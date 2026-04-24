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

  it("binds rank 1 to the --term-rank-1 terminal token with an amber fallback", () => {
    render(<RankDot rank={1} />);
    const dot = screen.getByTestId("rank-dot");
    expect(dot.className).toContain("var(--term-rank-1,#f59e0b)");
    expect(dot).toHaveAttribute("data-rank", "1");
  });

  it("binds rank 2 to the --term-rank-2 terminal token with a zinc fallback", () => {
    render(<RankDot rank={2} />);
    const dot = screen.getByTestId("rank-dot");
    expect(dot.className).toContain("var(--term-rank-2,#71717a)");
    expect(dot).toHaveAttribute("data-rank", "2");
  });

  it("binds rank 3 to the --term-rank-3 terminal token with an orange fallback", () => {
    render(<RankDot rank={3} />);
    const dot = screen.getByTestId("rank-dot");
    expect(dot.className).toContain("var(--term-rank-3,#c2410c)");
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
