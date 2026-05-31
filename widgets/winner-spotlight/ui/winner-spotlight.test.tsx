import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MonthlyTopProject } from "../api/fetch-monthly-top-projects";
import { WinnerSpotlight } from "./winner-spotlight";

function makeWinner(
  overrides: Partial<MonthlyTopProject> = {}
): MonthlyTopProject {
  return {
    id: "winner-1",
    title: "Winner Project",
    tagline: "A great project",
    primary_image_path: "u1/winner.png",
    created_at: "2026-05-20T03:00:00Z",
    vote_count: 42,
    cohort_id: "cohort-9",
    cohort_label: "9기",
    author_display_name: "Alice",
    screenshotUrl: "https://cdn.example.com/u1/winner.png",
    ...overrides,
  };
}

describe("WinnerSpotlight", () => {
  it("links the title to the project detail page", () => {
    render(<WinnerSpotlight winner={makeWinner()} />);

    const titleLink = screen.getByRole("link", { name: "Winner Project" });
    expect(titleLink).toHaveAttribute("href", "/projects/winner-1");
  });

  it("links the cohort label to the projects board filtered by cohort", () => {
    render(<WinnerSpotlight winner={makeWinner()} />);

    const cohortLink = screen.getByRole("link", { name: "9기" });
    expect(cohortLink).toHaveAttribute("href", "/projects?cohort=cohort-9");
  });

  it("renders the cohort label as plain text when the project has no cohort", () => {
    render(
      <WinnerSpotlight
        winner={makeWinner({ cohort_id: null, cohort_label: null })}
      />
    );

    expect(screen.queryByRole("link", { name: "9기" })).not.toBeInTheDocument();
  });
});
