import type { ProjectWithVoteCount } from "@entities/vote";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectCard } from "./project-card";

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    className,
  }: {
    alt: string;
    src: string;
    className?: string;
  }) => (
    <div
      aria-label={alt}
      className={className}
      data-src={src}
      data-testid="project-card-thumb"
      role="img"
    />
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

describe("ProjectCard (terminal row)", () => {
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

  it("renders the rank as a two-digit zero-padded number", () => {
    const { rerender } = render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.getByText("01")).toBeInTheDocument();

    rerender(
      <ProjectCard
        project={buildProject()}
        rank={42}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders a rank dot for ranks 1–3 and dims the number for 4+", () => {
    const { rerender } = render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.getByTestId("rank-dot")).toHaveAttribute("data-rank", "1");

    rerender(
      <ProjectCard
        project={buildProject()}
        rank={4}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.queryByTestId("rank-dot")).toBeNull();
    expect(screen.getByText("04").className).toContain("text-muted-foreground");
  });

  it("opens the project URL in a new tab from both the thumbnail and the title link", () => {
    render(
      <ProjectCard
        project={buildProject({ project_url: "https://myapp.com" })}
        rank={5}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "https://myapp.com");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("scales the thumbnail on row hover via group-hover CSS", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={2}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const row = screen.getByTestId("project-card");
    expect(row.className).toContain("group/row");
    expect(row.className).toContain("hover:bg-muted");

    const thumb = screen.getByTestId("project-card-thumb");
    expect(thumb.className).toContain("group-hover/row:scale-[1.08]");
    expect(thumb.className).toContain("origin-left");
    expect(thumb.className).toContain("transition-transform");
  });

  it("renders the vote-button slot once, separate from the owner-actions region", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={10}
        renderOwnerActions={() => <button type="button">owner</button>}
        renderVoteButton={() => <span data-testid="vote-slot">vote-slot</span>}
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

  it("accepts the priority prop for above-the-fold rows", () => {
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
});
