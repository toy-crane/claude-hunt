import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "../api/queries";
import { Hero } from "./hero";

const VISIT_BUTTON_NAME = /Visit project/i;

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    "data-testid": dataTestId,
  }: {
    alt: string;
    src: string;
    "data-testid"?: string;
  }) => (
    <div aria-label={alt} data-src={src} data-testid={dataTestId} role="img" />
  ),
}));

vi.mock("@features/toggle-vote", () => ({
  VoteButton: ({
    voteCount,
    ownedByViewer,
  }: {
    voteCount: number;
    ownedByViewer: boolean;
  }) => (
    <button
      data-owned={String(ownedByViewer)}
      data-testid="vote-button"
      type="button"
    >
      {voteCount}
    </button>
  ),
}));

// Mock OwnerControls so the test doesn't pull in the deleteProject
// server action (which loads env at import time).
vi.mock("./owner-controls", () => ({
  OwnerControls: () => (
    <div data-testid="project-detail-owner-controls">owner-controls</div>
  ),
}));

function buildProject(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "proj-1",
    user_id: "user-alice",
    cohort_id: "cohort-1",
    cohort_name: "LGE-1",
    title: "My App",
    tagline: "A cool tool for tracking habits",
    project_url: "https://myapp.com",
    github_url: null,
    images: [{ path: "user-alice/p1.webp" }],
    imageUrls: ["https://cdn.example.com/user-alice/p1.webp"],
    primaryImageUrl: "https://cdn.example.com/user-alice/p1.webp",
    vote_count: 128,
    viewer_has_voted: false,
    author_display_name: "Alice",
    author_avatar_url: null,
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    ...overrides,
  };
}

describe("<Hero />", () => {
  it("renders title, full tagline, cohort, author, and vote count", () => {
    render(
      <Hero
        isAuthenticated={false}
        project={buildProject()}
        viewerUserId={null}
      />
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "My App"
    );
    expect(screen.getByTestId("project-detail-tagline")).toHaveTextContent(
      "A cool tool for tracking habits"
    );
    expect(screen.getByText("LGE-1")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByTestId("vote-button")).toHaveTextContent("128");
  });

  it("opens the project URL in a new tab via the Visit project button", () => {
    render(
      <Hero
        isAuthenticated={false}
        project={buildProject()}
        viewerUserId={null}
      />
    );
    const visit = screen.getByRole("link", { name: VISIT_BUTTON_NAME });
    expect(visit).toHaveAttribute("href", "https://myapp.com");
    expect(visit).toHaveAttribute("target", "_blank");
    expect(visit).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("hides the GitHub link when github_url is null", () => {
    render(
      <Hero
        isAuthenticated={false}
        project={buildProject({ github_url: null })}
        viewerUserId={null}
      />
    );
    expect(
      screen.queryByTestId("project-detail-github-link")
    ).not.toBeInTheDocument();
  });

  it("renders the GitHub link when github_url is set, opening in a new tab", () => {
    render(
      <Hero
        isAuthenticated={false}
        project={buildProject({
          github_url: "https://github.com/octocat/hello",
        })}
        viewerUserId={null}
      />
    );
    const link = screen.getByTestId("project-detail-github-link");
    expect(link).toHaveAttribute("href", "https://github.com/octocat/hello");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("flags the vote button as owned when the viewer is the author (self-vote prevented)", () => {
    render(
      <Hero
        isAuthenticated={true}
        project={buildProject()}
        viewerUserId="user-alice"
      />
    );
    expect(screen.getByTestId("vote-button")).toHaveAttribute(
      "data-owned",
      "true"
    );
  });

  it("anonymous and signed-in visitors see the same project content", () => {
    const project = buildProject();
    const { container: anonContainer } = render(
      <Hero isAuthenticated={false} project={project} viewerUserId={null} />
    );
    const anonText = anonContainer.textContent ?? "";
    const { container: authedContainer } = render(
      <Hero isAuthenticated={true} project={project} viewerUserId="user-bob" />
    );
    const authedText = authedContainer.textContent ?? "";
    expect(anonText).toBe(authedText);
  });
});
