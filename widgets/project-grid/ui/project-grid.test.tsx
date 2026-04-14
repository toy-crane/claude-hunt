import type { ProjectWithVoteCount } from "@entities/vote/index.ts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectGrid } from "./project-grid.tsx";

function buildProject(
  overrides: Partial<ProjectWithVoteCount> & { id: string; title: string }
): ProjectWithVoteCount {
  return {
    user_id: "user-1",
    cohort_id: "cohort-1",
    cohort_name: "Cohort A",
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

describe("ProjectGrid", () => {
  it("renders a card for each project and applies rank badges to the top three", () => {
    const projects = [
      buildProject({ id: "p1", title: "A", vote_count: 9 }),
      buildProject({ id: "p2", title: "B", vote_count: 7 }),
      buildProject({ id: "p3", title: "C", vote_count: 5 }),
      buildProject({ id: "p4", title: "D", vote_count: 3 }),
      buildProject({ id: "p5", title: "E", vote_count: 1 }),
    ];

    render(
      <ProjectGrid
        projects={projects}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    );

    expect(screen.getAllByTestId("project-card")).toHaveLength(5);
    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.getByText("3rd")).toBeInTheDocument();
  });

  it("renders only 1st and 2nd badges when there are exactly 2 projects", () => {
    const projects = [
      buildProject({ id: "p1", title: "A", vote_count: 9 }),
      buildProject({ id: "p2", title: "B", vote_count: 7 }),
    ];

    render(
      <ProjectGrid
        projects={projects}
        resolveScreenshotUrl={resolveScreenshotUrl}
      />
    );

    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.queryByText("3rd")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no projects", () => {
    render(
      <ProjectGrid projects={[]} resolveScreenshotUrl={resolveScreenshotUrl} />
    );

    expect(screen.getByTestId("project-grid-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("project-grid")).not.toBeInTheDocument();
  });
});
