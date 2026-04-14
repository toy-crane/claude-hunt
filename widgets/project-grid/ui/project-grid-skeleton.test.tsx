import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectGridSkeleton } from "./project-grid-skeleton";

describe("ProjectGridSkeleton", () => {
  it("renders 6 skeleton cards by default", () => {
    render(<ProjectGridSkeleton />);
    expect(screen.getAllByTestId("project-card-skeleton")).toHaveLength(6);
  });

  it("renders a grid container", () => {
    const { container } = render(<ProjectGridSkeleton />);
    expect(
      container.querySelector('[data-testid="project-grid-skeleton"]')
    ).toBeInTheDocument();
  });

  it("renders a custom number of skeleton cards when count prop is set", () => {
    render(<ProjectGridSkeleton count={3} />);
    expect(screen.getAllByTestId("project-card-skeleton")).toHaveLength(3);
  });
});
