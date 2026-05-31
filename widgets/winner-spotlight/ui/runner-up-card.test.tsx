import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MonthlyTopProject } from "../api/fetch-monthly-top-projects";
import { RunnerUpCard } from "./runner-up-card";

function makeProject(
  overrides: Partial<MonthlyTopProject> = {}
): MonthlyTopProject {
  return {
    id: "runner-2",
    title: "Runner Up Project",
    tagline: "Also great",
    primary_image_path: "u2/runner.png",
    created_at: "2026-05-18T03:00:00Z",
    vote_count: 21,
    cohort_id: "cohort-9",
    cohort_label: "9기",
    author_display_name: "Bob",
    screenshotUrl: "https://cdn.example.com/u2/runner.png",
    ...overrides,
  };
}

describe("RunnerUpCard", () => {
  it("links the card to the project detail page via the title", () => {
    render(<RunnerUpCard project={makeProject()} rank={2} />);

    const detailLink = screen.getByRole("link", {
      name: "Runner Up Project",
    });
    expect(detailLink).toHaveAttribute("href", "/projects/runner-2");
  });

  it("links the cohort label to the projects board filtered by cohort", () => {
    render(<RunnerUpCard project={makeProject()} rank={2} />);

    const cohortLink = screen.getByRole("link", { name: "9기" });
    expect(cohortLink).toHaveAttribute("href", "/projects?cohort=cohort-9");
  });

  it("renders the cohort label as plain text when the project has no cohort", () => {
    render(
      <RunnerUpCard
        project={makeProject({ cohort_id: null, cohort_label: null })}
        rank={3}
      />
    );

    expect(screen.queryByRole("link", { name: "9기" })).not.toBeInTheDocument();
  });
});
