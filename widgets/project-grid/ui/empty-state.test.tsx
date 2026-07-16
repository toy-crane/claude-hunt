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

  it("points at the other classes instead of inviting a submission when a filter is on", () => {
    // The board still holds projects here, so "첫 프로젝트를 제출해 보세요"
    // would be false — the way out is changing the filter.
    render(<EmptyState filtered />);
    expect(screen.getByText("다른 클래스를 골라보세요.")).toBeInTheDocument();
    expect(
      screen.queryByText("첫 프로젝트를 제출해 보세요.")
    ).not.toBeInTheDocument();
  });
});
