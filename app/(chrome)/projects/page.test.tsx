import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./_components/project-board-section", () => ({
  ProjectBoardSection: () => <div data-testid="project-board-section-stub" />,
}));

describe("/projects page", () => {
  it("renders the 프로젝트 보드 heading in the static shell", async () => {
    const { default: Page } = await import("./page");
    render(Page({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "프로젝트 보드", level: 1 })
    ).toBeInTheDocument();
  });

  it("renders the board section behind the shell", async () => {
    const { default: Page } = await import("./page");
    render(Page({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByTestId("project-board-section-stub")
    ).toBeInTheDocument();
  });

  it("declares a self-referencing /projects canonical", async () => {
    const { metadata } = await import("./page");
    expect(metadata.alternates?.canonical).toBe("/projects");
  });

  it("exports an absolute title carrying the 클로드 헌트 brand", async () => {
    const { metadata } = await import("./page");
    expect(metadata.title).toEqual(
      expect.objectContaining({
        absolute: expect.stringContaining("클로드 헌트"),
      })
    );
  });
});
