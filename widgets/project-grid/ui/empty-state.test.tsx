import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("<EmptyState />", () => {
  it("renders the Korean empty title", () => {
    render(<EmptyState />);
    expect(screen.getByText("아직 프로젝트가 없어요")).toBeInTheDocument();
  });

  it("renders the Korean empty description", () => {
    render(<EmptyState />);
    expect(
      screen.getByText("첫 프로젝트를 제출해 보세요.")
    ).toBeInTheDocument();
  });

  it("does not leak English copy", () => {
    render(<EmptyState />);
    const empty = screen.getByTestId("project-grid-empty");
    expect(empty.textContent ?? "").not.toContain("No projects");
    expect(empty.textContent ?? "").not.toContain("Be the first");
  });
});
