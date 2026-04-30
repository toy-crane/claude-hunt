import type { ProjectWithVoteCount } from "@entities/vote";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    images: [{ path: "user-1/screenshot.png" }],
    primary_image_path: "user-1/screenshot.png",
    github_url: null,
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

describe("ProjectCard — desktop hover preview popover", () => {
  function getDesktopTrigger() {
    const desktop = screen.getByTestId("project-card-desktop");
    return within(desktop).getByTestId("project-card-preview");
  }

  it("opens the preview popover after hovering the desktop thumbnail", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    await user.hover(getDesktopTrigger());

    expect(
      await screen.findByTestId("project-card-preview-popover", undefined, {
        timeout: 1000,
      })
    ).toBeInTheDocument();
  });

  it("renders the popover image with the same source as the trigger thumbnail", async () => {
    const user = userEvent.setup();
    const screenshotUrl = "https://cdn.example.com/shot.png";
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl={screenshotUrl}
      />
    );
    const trigger = getDesktopTrigger();
    const thumb = within(trigger).getByTestId("project-card-thumb");

    await user.hover(trigger);

    const popover = await screen.findByTestId(
      "project-card-preview-popover",
      undefined,
      { timeout: 1000 }
    );
    expect(popover.getAttribute("data-src")).toBe(
      thumb.getAttribute("data-src")
    );
    expect(popover.getAttribute("data-src")).toBe(screenshotUrl);
  });

  it("does not open synchronously on hover — openDelay protects against rapid-pass noise", async () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    fireEvent.pointerEnter(getDesktopTrigger(), { pointerType: "mouse" });

    expect(
      screen.queryByTestId("project-card-preview-popover")
    ).not.toBeInTheDocument();

    expect(
      await screen.findByTestId("project-card-preview-popover", undefined, {
        timeout: 1000,
      })
    ).toBeInTheDocument();
  });

  it("opens the preview popover when keyboard focus lands on the trigger", async () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    fireEvent.focus(getDesktopTrigger());

    expect(
      await screen.findByTestId("project-card-preview-popover", undefined, {
        timeout: 1000,
      })
    ).toBeInTheDocument();
  });

  it("closes the preview popover when focus leaves the trigger", async () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const trigger = getDesktopTrigger();
    fireEvent.focus(trigger);
    await screen.findByTestId("project-card-preview-popover", undefined, {
      timeout: 1000,
    });

    fireEvent.blur(trigger);
    await waitFor(
      () =>
        expect(
          screen.queryByTestId("project-card-preview-popover")
        ).not.toBeInTheDocument(),
      { timeout: 1000 }
    );
  });

  it("does not close synchronously when the cursor leaves — closeDelay grace period", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const trigger = getDesktopTrigger();
    await user.hover(trigger);
    await screen.findByTestId("project-card-preview-popover", undefined, {
      timeout: 1000,
    });

    fireEvent.pointerLeave(trigger, { pointerType: "mouse" });

    expect(
      screen.queryByTestId("project-card-preview-popover")
    ).toBeInTheDocument();
  });

  it("closes the popover after the cursor has left for long enough", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const trigger = getDesktopTrigger();
    await user.hover(trigger);
    await screen.findByTestId("project-card-preview-popover", undefined, {
      timeout: 1000,
    });

    await user.unhover(trigger);

    await waitFor(
      () =>
        expect(
          screen.queryByTestId("project-card-preview-popover")
        ).not.toBeInTheDocument(),
      { timeout: 1000 }
    );
  });

  it("does not render a popover when the project has no screenshot", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCard
        project={buildProject({ screenshot_path: null })}
        rank={1}
        screenshotUrl=""
      />
    );
    await user.hover(getDesktopTrigger());

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(
      screen.queryByTestId("project-card-preview-popover")
    ).not.toBeInTheDocument();
  });

  it("keeps the trigger link href and target intact for empty-screenshot rows", () => {
    render(
      <ProjectCard
        project={buildProject({
          screenshot_path: null,
          project_url: "https://myapp.com",
        })}
        rank={1}
        screenshotUrl=""
      />
    );
    const trigger = getDesktopTrigger();
    expect(trigger).toHaveAttribute("href", "https://myapp.com");
    expect(trigger).toHaveAttribute("target", "_blank");
  });

  it("keeps the trigger link href and target intact while the popover is open", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCard
        project={buildProject({ project_url: "https://myapp.com" })}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const trigger = getDesktopTrigger();
    await user.hover(trigger);
    await screen.findByTestId("project-card-preview-popover", undefined, {
      timeout: 1000,
    });

    expect(trigger).toHaveAttribute("href", "https://myapp.com");
    expect(trigger).toHaveAttribute("target", "_blank");
  });

  it("keeps the popover open when the cursor moves from the trigger onto the popover content", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCard
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const trigger = getDesktopTrigger();
    await user.hover(trigger);
    const popover = await screen.findByTestId(
      "project-card-preview-popover",
      undefined,
      { timeout: 1000 }
    );

    fireEvent.pointerLeave(trigger, { pointerType: "mouse" });
    fireEvent.pointerEnter(popover, { pointerType: "mouse" });

    // Wait beyond the closeDelay window (150 ms grace + buffer).
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(
      screen.getByTestId("project-card-preview-popover")
    ).toBeInTheDocument();
  });
});

describe("ProjectCard — mobile stacked card (< 720 px)", () => {
  it("stacks top-to-bottom: meta, thumb, title+tagline, footer", () => {
    render(
      <ProjectCard
        cohortLabel="LG전자 1기"
        project={buildProject()}
        rank={5}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const mobile = screen.getByTestId("project-card-mobile");
    expect(mobile.className).toContain("flex-col");
    expect(mobile.className).toContain("min-[720px]:hidden");

    const children = Array.from(mobile.children);
    expect(children[0]).toHaveAttribute(
      "data-testid",
      "project-card-mobile-meta"
    );
    expect(children[1]).toHaveAttribute(
      "data-testid",
      "project-card-mobile-preview"
    );
    expect(children[3]).toHaveAttribute(
      "data-testid",
      "project-card-mobile-footer"
    );
  });

  it("hides the mobile card at ≥ 720 px via Tailwind visibility classes", () => {
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

  it("shows rank + dot + class label on the meta line for ranks 1–3", () => {
    render(
      <ProjectCard
        cohortLabel="LG전자 1기"
        project={buildProject()}
        rank={1}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const meta = screen.getByTestId("project-card-mobile-meta");
    expect(within(meta).getByTestId("rank-dot")).toBeInTheDocument();
    expect(meta.textContent).toContain("01");
    expect(meta.textContent).toContain("LG전자 1기");
  });

  it("dims the rank number and omits the dot for ranks 4+", () => {
    render(
      <ProjectCard
        cohortLabel="LG전자 1기"
        project={buildProject()}
        rank={7}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const meta = screen.getByTestId("project-card-mobile-meta");
    expect(within(meta).queryByTestId("rank-dot")).toBeNull();
    const rankSpan = within(meta).getByText("07");
    expect(rankSpan.className).toContain("text-muted-foreground");
  });

  it("omits the class segment when cohortLabel is null (meta shows rank only)", () => {
    render(
      <ProjectCard
        cohortLabel={null}
        project={buildProject()}
        rank={4}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const meta = screen.getByTestId("project-card-mobile-meta");
    // Only the rank number is present; no trailing `·` or label.
    expect(meta.textContent?.trim()).toBe("04");
  });

  it("renders a full-width 16:10 thumbnail", () => {
    render(
      <ProjectCard
        project={buildProject()}
        rank={2}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const preview = screen.getByTestId("project-card-mobile-preview");
    expect(preview.className).toContain("w-full");
    expect(preview.className).toContain("aspect-[16/10]");
  });

  it("renders title in heading font at 16 px and tagline at 13 px muted", () => {
    render(
      <ProjectCard
        project={buildProject({
          title: "Mobile App",
          tagline: "Mobile tagline",
        })}
        rank={2}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const title = screen.getByTestId("project-card-mobile-title");
    expect(title.textContent).toBe("Mobile App");
    expect(title.className).toContain("font-heading");
    expect(title.className).toContain("text-base");

    const tagline = screen.getByTestId("project-card-mobile-tagline");
    expect(tagline.textContent).toBe("Mobile tagline");
    expect(tagline.className).toContain("text-[13px]");
    expect(tagline.className).toContain("text-muted-foreground");
  });

  it("shows `{author} · {submittedAt}` on the left and the vote slot on the right in the footer", () => {
    render(
      <ProjectCard
        project={buildProject({
          author_display_name: "Nari",
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        })}
        rank={2}
        renderVoteButton={() => (
          <button data-testid="mobile-vote-slot" type="button">
            vote
          </button>
        )}
        screenshotUrl="https://cdn.example.com/shot.png"
      />
    );
    const footer = screen.getByTestId("project-card-mobile-footer");
    expect(within(footer).getByText("Nari")).toBeInTheDocument();
    expect(within(footer).getByText("3h")).toBeInTheDocument();
    expect(within(footer).getByTestId("mobile-vote-slot")).toBeInTheDocument();
  });

  it("keeps the owner-row footer and non-owner-row footer structurally identical (no height shift)", () => {
    const ownerSlot = () => <span data-testid="owner-icons">[edit][del]</span>;
    const voteSlot = () => <span data-testid="vote-slot">v</span>;

    const { rerender } = render(
      <ProjectCard
        project={buildProject({ user_id: "u1" })}
        rank={5}
        renderOwnerActions={ownerSlot}
        renderVoteButton={voteSlot}
        screenshotUrl="https://cdn.example.com/shot.png"
        viewerUserId="u1"
      />
    );
    const ownerFooter = screen.getByTestId("project-card-mobile-footer");
    expect(within(ownerFooter).getByTestId("owner-icons")).toBeInTheDocument();
    const ownerFooterClasses = ownerFooter.className;

    rerender(
      <ProjectCard
        project={buildProject({ user_id: "u2" })}
        rank={5}
        renderOwnerActions={ownerSlot}
        renderVoteButton={voteSlot}
        screenshotUrl="https://cdn.example.com/shot.png"
        viewerUserId="u1"
      />
    );
    const nonOwnerFooter = screen.getByTestId("project-card-mobile-footer");
    expect(within(nonOwnerFooter).queryByTestId("owner-icons")).toBeNull();

    // The owner and non-owner footers share the same outer classes
    // (same flexbox layout, same gaps) — icon slot sits inline with the
    // vote slot on the right so the footer's height does not change.
    expect(nonOwnerFooter.className).toBe(ownerFooterClasses);
  });
});
