import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MyProjectRow } from "../api/fetch-my-projects";

const { MyProjectsList } = await import("./my-projects-list");

const TOTAL_COUNT_RE = /총 2개의 프로젝트/;
const NEW_PROJECT_CTA_RE = /새 프로젝트 제출하기/;

function buildProject(overrides: Partial<MyProjectRow> = {}): MyProjectRow {
  return {
    id: "proj-1",
    title: "PR 리뷰 메이트",
    tagline: "Claude에게 PR을 먼저 읽혀서 팀 리뷰 시간을 줄여주는 CLI.",
    primary_image_path: "user-1/shot.png",
    created_at: "2026-03-28T10:20:00Z",
    vote_count: 36,
    screenshotUrl: "https://example.com/shot.png",
    ...overrides,
  };
}

describe("<MyProjectsList />", () => {
  it("renders one row per project with title, vote count, and submitted date", () => {
    render(
      <MyProjectsList
        projects={[
          buildProject(),
          buildProject({
            id: "proj-2",
            title: "코딩 학습 트래커",
            vote_count: 42,
            created_at: "2026-04-12T00:00:00Z",
          }),
        ]}
      />
    );

    const rows = screen.getAllByTestId("my-project-row");
    expect(rows).toHaveLength(2);

    expect(within(rows[0]).getByText("PR 리뷰 메이트")).toBeInTheDocument();
    // Vote count appears in two slots (mobile meta + desktop column) — both
    // hidden via Tailwind classes but mounted in the DOM. Use queryAllByText.
    expect(within(rows[0]).getAllByText("36").length).toBeGreaterThan(0);
    expect(within(rows[0]).getAllByText("2026-03-28").length).toBeGreaterThan(
      0
    );

    expect(within(rows[1]).getByText("코딩 학습 트래커")).toBeInTheDocument();
    expect(within(rows[1]).getAllByText("42").length).toBeGreaterThan(0);
  });

  it("renders no action controls when renderActions is not provided", () => {
    render(<MyProjectsList projects={[buildProject({ id: "abc-123" })]} />);

    expect(
      screen.queryByRole("link", { name: "프로젝트 수정" })
    ).not.toBeInTheDocument();
  });

  it("renders the owner-supplied renderActions slot for each row", () => {
    render(
      <MyProjectsList
        projects={[buildProject({ id: "p1" }), buildProject({ id: "p2" })]}
        renderActions={(project) => (
          <button data-project-id={project.id} type="button">
            do-something
          </button>
        )}
      />
    );

    const actionButtons = screen.getAllByRole("button", {
      name: "do-something",
    });
    expect(actionButtons).toHaveLength(2);
    expect(actionButtons[0]).toHaveAttribute("data-project-id", "p1");
    expect(actionButtons[1]).toHaveAttribute("data-project-id", "p2");
  });

  it("shows the terminal-style total count footer", () => {
    render(
      <MyProjectsList projects={[buildProject(), buildProject({ id: "p2" })]} />
    );
    expect(
      screen.getByText(TOTAL_COUNT_RE, { exact: false })
    ).toBeInTheDocument();
  });

  it("renders the empty state with a new-project CTA when the list is empty", () => {
    render(<MyProjectsList projects={[]} />);

    expect(screen.getByTestId("my-projects-empty")).toBeInTheDocument();
    expect(
      screen.getByText("아직 제출한 프로젝트가 없어요.")
    ).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: NEW_PROJECT_CTA_RE });
    expect(cta).toHaveAttribute("href", "/projects/new?from=settings");

    // No table rows when empty.
    expect(screen.queryAllByTestId("my-project-row")).toHaveLength(0);
  });
});
