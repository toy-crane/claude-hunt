import type { ProjectWithVoteCount } from "@entities/vote";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectCard } from "./project-card";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));

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
  it("renders title, tagline, and author display name", () => {
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
  });

  it("renders the vote count in only one place (via the slot) when a vote button is provided", () => {
    render(
      <ProjectCard
        project={buildProject({ vote_count: 5 })}
        rank={10}
        renderVoteButton={(project) => (
          <span data-testid="vote-slot">{project.vote_count}</span>
        )}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );

    const allFives = screen.getAllByText("5");
    expect(allFives).toHaveLength(1);
    expect(screen.getByTestId("vote-slot")).toHaveTextContent("5");
  });

  it("renders the vote button slot inside the card but outside the bottom owner-actions region", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={10}
        renderOwnerActions={() => <button type="button">Edit</button>}
        renderVoteButton={() => <span data-testid="vote-slot">vote</span>}
        screenshotUrl="https://cdn.example.com/shot.png"
        viewerUserId="user-1"
      />
    );

    const voteSlot = screen.getByTestId("vote-slot");
    const ownerActions = screen.getByTestId("project-card-owner-actions");
    expect(ownerActions.contains(voteSlot)).toBe(false);
  });

  it("renders owner actions only when the viewer is the project owner", () => {
    const { rerender } = render(
      <ProjectCard
        project={buildProject({ user_id: "user-1" })}
        rank={10}
        renderOwnerActions={() => <span>owner-tools</span>}
        screenshotUrl="https://cdn.example.com/shot.png"
        viewerUserId="user-1"
      />
    );
    expect(screen.getByText("owner-tools")).toBeInTheDocument();

    rerender(
      <ProjectCard
        project={buildProject({ user_id: "user-1" })}
        rank={10}
        renderOwnerActions={() => <span>owner-tools</span>}
        screenshotUrl="https://cdn.example.com/shot.png"
        viewerUserId="someone-else"
      />
    );
    expect(screen.queryByText("owner-tools")).toBeNull();
  });

  it("renders the screenshot with the supplied URL and Korean alt suffix", () => {
    render(
      <ProjectCard
        project={buildProject({ title: "Paint" })}
        rank={10}
        screenshotUrl="https://cdn.example.com/paint.png"
      />
    );

    const img = screen.getByLabelText("Paint 스크린샷");
    expect(img.getAttribute("data-src")).toContain("paint.png");
  });

  it("accepts the priority prop for above-the-fold cards", () => {
    render(
      <ProjectCard
        priority
        project={buildProject({ title: "Top" })}
        rank={1}
        screenshotUrl="https://cdn.example.com/top.png"
      />
    );

    expect(screen.getByLabelText("Top 스크린샷")).toBeInTheDocument();
  });

  it("falls back to '익명' when author_display_name is missing", () => {
    render(
      <ProjectCard
        project={buildProject({ author_display_name: null })}
        rank={10}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.getByText("익명")).toBeInTheDocument();
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
