import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankBadge } from "./rank-badge";

describe("RankBadge", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
  ])("renders the label and dot for rank %s", (rank, label) => {
    render(<RankBadge rank={rank} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTestId("rank-dot")).toBeInTheDocument();
  });

  it.each([0, 4, 5, 99, -1])("renders nothing for rank %s", (rank) => {
    const { container } = render(<RankBadge rank={rank} />);
    expect(container).toBeEmptyDOMElement();
  });
});
