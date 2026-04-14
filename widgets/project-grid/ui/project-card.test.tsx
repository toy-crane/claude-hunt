import type { ProjectWithVoteCount } from "@entities/vote";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectCard } from "./project-card";

function buildProject(
  overrides: Partial<ProjectWithVoteCount> = {}
): ProjectWithVoteCount {
  return {
    id: "proj-1",
    user_id: "user-1",
    cohort_id: "cohort-1",
    cohort_name: "LGE-1",
    title: "My App",
    tagline: "A cool tool",
    project_url: "https://myapp.com",
    screenshot_path: "user-1/screenshot.png",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    vote_count: 5,
    author_display_name: "Alice",
    author_avatar_url: null,
    ...overrides,
  };
}

const RANK_BADGE_LABEL = /1st|2nd|3rd/;

describe("ProjectCard", () => {
  it("renders title, tagline, author display name, and vote count", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={10}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );

    expect(screen.getByText("My App")).toBeInTheDocument();
    expect(screen.getByText("A cool tool")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByTestId("vote-count")).toHaveTextContent("5");
  });

  it("renders the screenshot with the supplied URL and title in the alt text", () => {
    render(
      <ProjectCard
        project={buildProject({ title: "Paint" })}
        rank={10}
        screenshotUrl="https://cdn.example.com/paint.png"
      />
    );

    const img = screen.getByAltText("Paint screenshot") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/paint.png");
  });

  it("shows a rank badge when rank is 1, 2, or 3", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.getByText("1st")).toBeInTheDocument();
  });

  it("omits the rank badge when rank is 4 or worse", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={4}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.queryByText(RANK_BADGE_LABEL)).not.toBeInTheDocument();
  });
});
