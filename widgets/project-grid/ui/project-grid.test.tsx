import type { ProjectWithVoteCount } from "@entities/vote";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectGrid } from "./project-grid";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));

function buildProject(
  overrides: Partial<ProjectWithVoteCount> & { id: string; title: string }
): ProjectWithVoteCount {
  return {
    user_id: "user-1",
    cohort_id: "cohort-1",
    cohort_name: "LGE-1",
    tagline: `${overrides.title} tagline`,
    project_url: "https://example.com",
    screenshot_path: `user-1/${overrides.id}.png`,
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    vote_count: 0,
    author_display_name: "Author",
    author_avatar_url: null,
    ...overrides,
  };
}

const resolveScreenshotUrl = (path: string) =>
  `https://cdn.example.com/${path}`;

describe("ProjectGrid (terminal list)", () => {
  it("renders one row per project in the supplied order", () => {
    const projects = [
      buildProject({ id: "p1", title: "A", vote_count: 9 }),
      buildProject({ id: "p2", title: "B", vote_count: 7 }),
      buildProject({ id: "p3", title: "C", vote_count: 5 }),
      buildProject({ id: "p4", title: "D", vote_count: 3 }),
      buildProject({ id: "p5", title: "E", vote_count: 1 }),
      buildProject({ id: "p6", title: "F", vote_count: 0 }),
    ];

    render(
      <ProjectGrid
        projects={projects}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    );

    const rows = screen.getAllByTestId("project-card");
    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent("A");
    expect(rows[5]).toHaveTextContent("F");
  });

  it("applies rank dots to the first three rows and none to ranks 4+", () => {
    const projects = [
      buildProject({ id: "p1", title: "A" }),
      buildProject({ id: "p2", title: "B" }),
      buildProject({ id: "p3", title: "C" }),
      buildProject({ id: "p4", title: "D" }),
      buildProject({ id: "p5", title: "E" }),
    ];

    render(
      <ProjectGrid
        projects={projects}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    );

    const dots = screen.getAllByTestId("rank-dot");
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("data-rank", "1");
    expect(dots[1]).toHaveAttribute("data-rank", "2");
    expect(dots[2]).toHaveAttribute("data-rank", "3");
  });

  it("renders zero-padded rank numbers 01 through 11", () => {
    const projects = Array.from({ length: 11 }, (_, i) =>
      buildProject({ id: `p${i + 1}`, title: `P${i + 1}` })
    );

    render(
      <ProjectGrid
        projects={projects}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    );

    for (const label of [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders a desktop table header strip labelled RANK PREVIEW NAME AUTHOR VOTES", () => {
    render(
      <ProjectGrid
        projects={[buildProject({ id: "p1", title: "A" })]}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    );
    const header = screen.getByTestId("project-grid-header");
    expect(header.textContent).toBe("RANKPREVIEWNAMEAUTHORVOTES");
  });

  it("hides the desktop header strip below 720 px (min-[720px]:grid, hidden otherwise)", () => {
    render(
      <ProjectGrid
        projects={[buildProject({ id: "p1", title: "A" })]}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    );
    const header = screen.getByTestId("project-grid-header");
    expect(header.className).toContain("hidden");
    expect(header.className).toContain("min-[720px]:grid");
  });

  it("renders the empty state when there are no projects", () => {
    render(
      <ProjectGrid projects={[]} resolveScreenshotUrl={resolveScreenshotUrl} />
    );

    expect(screen.getByTestId("project-grid-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("project-grid")).not.toBeInTheDocument();
  });
});
