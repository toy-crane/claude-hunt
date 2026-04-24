import type { ProjectWithVoteCount } from "@entities/vote";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectCard } from "./project-card";

// The next/image mock forwards data-testid so desktop and mobile thumbs
// can be distinguished by the caller.
vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    className,
    "data-testid": dataTestId,
  }: {
    alt: string;
    src: string;
    className?: string;
    "data-testid"?: string;
  }) => (
    <div
      aria-label={alt}
      className={className}
      data-src={src}
      data-testid={dataTestId}
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

describe("ProjectCard (terminal row) — desktop branch", () => {
  it("renders title, tagline, and author display name", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={10}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const desktop = screen.getByTestId("project-card-desktop");
    expect(within(desktop).getByText("My App")).toBeInTheDocument();
    expect(within(desktop).getByText("A cool tool")).toBeInTheDocument();
    expect(within(desktop).getByText("Alice")).toBeInTheDocument();
  });

  it("renders the rank as a two-digit zero-padded number on desktop", () => {
    const { rerender } = render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(
      within(screen.getByTestId("project-card-desktop")).getByText("01")
    ).toBeInTheDocument();

    rerender(
      <ProjectCard
        project={buildProject()}
        rank={42}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(
      within(screen.getByTestId("project-card-desktop")).getByText("42")
    ).toBeInTheDocument();
  });

  it("renders a rank dot for ranks 1–3 and dims the number for 4+", () => {
    const { rerender } = render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const desktopRow = screen.getByTestId("project-card-desktop");
    expect(within(desktopRow).getByTestId("rank-dot")).toHaveAttribute(
      "data-rank",
      "1"
    );

    rerender(
      <ProjectCard
        project={buildProject()}
        rank={4}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const desktopRow4 = screen.getByTestId("project-card-desktop");
    expect(within(desktopRow4).queryByTestId("rank-dot")).toBeNull();
    expect(within(desktopRow4).getByText("04").className).toContain(
      "text-muted-foreground"
    );
  });

  it("opens the project URL in new tabs from every link (desktop branch)", () => {
    render(
      <ProjectCard
        project={buildProject({ project_url: "https://myapp.com" })}
        rank={5}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const links = within(
      screen.getByTestId("project-card-desktop")
    ).getAllByRole("link");
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
    const desktop = screen.getByTestId("project-card-desktop");
    const voteSlot = within(desktop).getByTestId("vote-slot");
    const ownerActions = within(desktop).getByTestId(
      "project-card-owner-actions"
    );
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
    expect(screen.getAllByText("owner-tools").length).toBeGreaterThanOrEqual(1);

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
    const imgs = screen.getAllByLabelText("Paint 스크린샷");
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    for (const img of imgs) {
      expect(img.getAttribute("data-src")).toContain("paint.png");
    }
  });

  it("falls back to '익명' when author_display_name is missing", () => {
    render(
      <ProjectCard
        project={buildProject({ author_display_name: null })}
        rank={10}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    expect(screen.getAllByText("익명").length).toBeGreaterThanOrEqual(1);
  });

  it("shows nickname only in the AUTHOR column (no avatar-initial bubble)", () => {
    render(
      <ProjectCard
        project={buildProject({ author_display_name: "Alice" })}
        rank={10}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const desktop = screen.getByTestId("project-card-desktop");
    expect(within(desktop).getByText("Alice")).toBeInTheDocument();
    // The AUTHOR cell should not render a circular avatar element.
    expect(desktop.querySelectorAll('[class*="rounded-full"]').length).toBe(0);
  });
});

describe("ProjectCard — mobile branch (< 720 px)", () => {
  it("renders the compact 64-px-tall mobile row with gap-3 padding", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={5}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const mobile = screen.getByTestId("project-card-mobile");
    expect(mobile.className).toContain("h-16");
    expect(mobile.className).toContain("min-[720px]:hidden");
  });

  it("hides the mobile row at ≥ 720 px via Tailwind visibility classes", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={5}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const mobile = screen.getByTestId("project-card-mobile");
    expect(mobile.className).toContain("min-[720px]:hidden");
    const desktop = screen.getByTestId("project-card-desktop");
    expect(desktop.className).toContain("hidden");
    expect(desktop.className).toContain("min-[720px]:grid");
  });

  it("overlays the rank badge on the 48×48 thumb for ranks 1–3 (with dot)", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const badge = screen.getByTestId("project-card-mobile-rank-badge");
    expect(badge.className).toContain("absolute");
    expect(badge.textContent).toContain("01");
    expect(within(badge).getByTestId("rank-dot")).toBeInTheDocument();
  });

  it("overlays a dim rank badge (no dot) for ranks 4+", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={5}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const badge = screen.getByTestId("project-card-mobile-rank-badge");
    expect(badge.textContent).toContain("05");
    expect(within(badge).queryByTestId("rank-dot")).toBeNull();
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("renders 48×48 thumbnail sizing on mobile", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={2}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const thumb = screen.getByTestId("project-card-mobile-thumb");
    expect(thumb.className).toContain("size-12");
  });

  it("renders a 3-line text block: title, tagline, author · submittedAt", () => {
    render(
      <ProjectCard
        project={buildProject({
          title: "Mobile App",
          tagline: "Mobile tagline",
          author_display_name: "Nari",
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        })}
        rank={2}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const mobile = screen.getByTestId("project-card-mobile");
    expect(within(mobile).getByText("Mobile App")).toBeInTheDocument();
    expect(within(mobile).getByText("Mobile tagline")).toBeInTheDocument();
    expect(
      within(mobile).getByText((text) => text.startsWith("Nari · "))
    ).toBeInTheDocument();
  });
});
