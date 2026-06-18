import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectDescription } from "./project-description";

const THREE_PLUS_NEWLINES = /\n{3,}/;

describe("<ProjectDescription />", () => {
  it("renders the description body and the section label", () => {
    render(<ProjectDescription description="첫 문단입니다." />);
    expect(screen.getByTestId("project-detail-description")).toHaveTextContent(
      "첫 문단입니다."
    );
    expect(screen.getByText("// 프로젝트 설명")).toBeInTheDocument();
  });

  it("collapses runs of blank lines down to a single blank line", () => {
    render(
      <ProjectDescription
        description={"첫 문단입니다.\n\n\n\n둘째 문단입니다."}
      />
    );
    const body = screen.getByTestId("project-detail-description");
    expect(body).toHaveTextContent("첫 문단입니다.");
    expect(body).toHaveTextContent("둘째 문단입니다.");
    expect(body.textContent).not.toMatch(THREE_PLUS_NEWLINES);
  });
});
