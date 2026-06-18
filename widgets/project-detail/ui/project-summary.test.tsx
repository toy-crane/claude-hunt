import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "../api/fetch-project-detail";
import { ProjectSummary } from "./project-summary";

const VISIT_BUTTON_NAME = /프로젝트 방문하기/;

vi.mock("@features/toggle-vote", () => ({
  VoteButton: ({
    voteCount,
    ownedByViewer,
    testIdSuffix,
  }: {
    voteCount: number;
    ownedByViewer: boolean;
    testIdSuffix?: string;
  }) => (
    <button
      data-owned={String(ownedByViewer)}
      data-testid={`vote-button-${testIdSuffix ?? "bare"}`}
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
    cohort_label: "LG전자 1기",
    cohort_name: "LGE-1",
    title: "My App",
    tagline: "A cool tool for tracking habits",
    description: null,
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

describe("<ProjectSummary />", () => {
  it("renders title, full tagline, cohort, author, and vote count", () => {
    render(
      <ProjectSummary
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
    expect(screen.getByText("LG전자 1기")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByTestId("vote-button-desktop")).toHaveTextContent("128");
  });

  it("flattens a multi-line tagline into a single line", () => {
    render(
      <ProjectSummary
        isAuthenticated={false}
        project={buildProject({ tagline: "첫 줄\n둘째 줄" })}
        viewerUserId={null}
      />
    );
    const tagline = screen.getByTestId("project-detail-tagline");
    expect(tagline).toHaveTextContent("첫 줄 둘째 줄");
    expect(tagline.textContent).not.toContain("\n");
  });

  it("links the cohort to the project list filtered by that cohort", () => {
    render(
      <ProjectSummary
        isAuthenticated={false}
        project={buildProject()}
        viewerUserId={null}
      />
    );
    const cohortLink = screen.getByRole("link", { name: "LG전자 1기" });
    expect(cohortLink).toHaveAttribute("href", "/projects?cohort=cohort-1");
  });

  it("omits the cohort link when the project has no cohort", () => {
    render(
      <ProjectSummary
        isAuthenticated={false}
        project={buildProject({ cohort_id: null, cohort_label: null })}
        viewerUserId={null}
      />
    );
    expect(screen.queryByText("LG전자 1기")).not.toBeInTheDocument();
  });

  it("opens the project URL in a new tab via the visit button", () => {
    render(
      <ProjectSummary
        isAuthenticated={false}
        project={buildProject()}
        viewerUserId={null}
      />
    );
    const visit = screen.getByRole("link", { name: VISIT_BUTTON_NAME });
    expect(visit).toHaveAttribute("href", "https://myapp.com");
    expect(visit).toHaveAttribute("target", "_blank");
    expect(visit).toHaveAttribute("rel", "noopener noreferrer ugc");
  });

  it("hides the GitHub link when github_url is null", () => {
    render(
      <ProjectSummary
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
      <ProjectSummary
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
    expect(link).toHaveAttribute("rel", "noopener noreferrer ugc");
  });

  it("flags the vote button as owned and shows owner controls for the author", () => {
    render(
      <ProjectSummary
        isAuthenticated={true}
        project={buildProject()}
        viewerUserId="user-alice"
      />
    );
    expect(screen.getByTestId("vote-button-desktop")).toHaveAttribute(
      "data-owned",
      "true"
    );
    expect(
      screen.getByTestId("project-detail-owner-controls")
    ).toBeInTheDocument();
  });

  it("hides owner controls for a non-author viewer", () => {
    render(
      <ProjectSummary
        isAuthenticated={true}
        project={buildProject()}
        viewerUserId="user-bob"
      />
    );
    expect(
      screen.queryByTestId("project-detail-owner-controls")
    ).not.toBeInTheDocument();
  });
});
