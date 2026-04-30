import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectGridRow } from "../api/fetch-projects";
import { ProjectGrid } from "./project-grid";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));

function buildProject(
  overrides: Partial<ProjectGridRow> & { id: string; title: string }
): ProjectGridRow {
  return {
    user_id: "user-1",
    cohort_id: "cohort-1",
    cohort_label: "LG전자 1기",
    cohort_name: "LGE-1",
    tagline: `${overrides.title} tagline`,
    project_url: "https://example.com",
    images: [{ path: `user-1/${overrides.id}.png` }],
    primary_image_path: `user-1/${overrides.id}.png`,
    github_url: null,
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    vote_count: 0,
    author_display_name: "Author",
    author_avatar_url: null,
    screenshotUrl: `https://cdn.example.com/user-1/${overrides.id}.png`,
    viewer_has_voted: false,
    ...overrides,
  };
}

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

    render(<ProjectGrid projects={projects} />);

    const rows = screen.getAllByTestId("project-card");
    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent("A");
    expect(rows[5]).toHaveTextContent("F");
  });

  it("applies rank dots to the first three rows and none to ranks 4+ (desktop branch)", () => {
    const projects = [
      buildProject({ id: "p1", title: "A" }),
      buildProject({ id: "p2", title: "B" }),
      buildProject({ id: "p3", title: "C" }),
      buildProject({ id: "p4", title: "D" }),
      buildProject({ id: "p5", title: "E" }),
    ];

    render(<ProjectGrid projects={projects} />);

    // Both the desktop branch (rank column) and the mobile branch (rank
    // overlay on thumb) render a dot for ranks 1–3 → 6 dots total.
    const dots = screen.getAllByTestId("rank-dot");
    expect(dots).toHaveLength(6);
    const ranks = dots.map((d) => d.getAttribute("data-rank")).sort();
    expect(ranks).toEqual(["1", "1", "2", "2", "3", "3"]);
  });

  it("renders zero-padded rank numbers 01 through 11 (one per branch)", () => {
    const projects = Array.from({ length: 11 }, (_, i) =>
      buildProject({ id: `p${i + 1}`, title: `P${i + 1}` })
    );

    render(<ProjectGrid projects={projects} />);

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
      // Once in the desktop row, once in the mobile row's rank badge.
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
  });

  it("renders a desktop table header strip labelled RANK PREVIEW NAME AUTHOR VOTES", () => {
    render(<ProjectGrid projects={[buildProject({ id: "p1", title: "A" })]} />);
    const header = screen.getByTestId("project-grid-header");
    expect(header.textContent).toBe("RANKPREVIEWNAMEAUTHORVOTES");
  });

  it("hides the desktop header strip below 720 px (min-[720px]:grid, hidden otherwise)", () => {
    render(<ProjectGrid projects={[buildProject({ id: "p1", title: "A" })]} />);
    const header = screen.getByTestId("project-grid-header");
    expect(header.className).toContain("hidden");
    expect(header.className).toContain("min-[720px]:grid");
  });

  it("renders the empty state when there are no projects", () => {
    render(<ProjectGrid projects={[]} />);

    expect(screen.getByTestId("project-grid-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("project-grid")).not.toBeInTheDocument();
  });
});
