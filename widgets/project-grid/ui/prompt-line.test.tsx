import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromptLine } from "./prompt-line";

const ACCENT_LIGHT = /#c15f3c/;
const ACCENT_DARK = /#e88a67/;

describe("PromptLine", () => {
  it("renders the default command when no class is selected", () => {
    render(<PromptLine cohortLabel={null} />);

    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      "$ claude-hunt ls --sort=votes"
    );
  });

  it("renders the class flag with the exact label when a class is selected", () => {
    render(<PromptLine cohortLabel="LG전자 1기" />);

    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      `$ claude-hunt ls --class="LG전자 1기" --sort=votes`
    );
  });

  it("paints the leading `$` with the brand terracotta color", () => {
    render(<PromptLine cohortLabel={null} />);

    const dollar = screen.getByTestId("prompt-line-dollar");
    expect(dollar).toHaveTextContent("$");
    // The Logo component uses the same pair; assert both are applied
    // (light class for :root, dark class for .dark).
    expect(dollar.className).toMatch(ACCENT_LIGHT);
    expect(dollar.className).toMatch(ACCENT_DARK);
  });

  it("does not contain the English word `cohort` in any user-visible text", () => {
    const { container: nullContainer } = render(
      <PromptLine cohortLabel={null} />
    );
    expect(nullContainer.textContent?.toLowerCase()).not.toContain("cohort");

    const { container: labeledContainer } = render(
      <PromptLine cohortLabel="LG전자 1기" />
    );
    expect(labeledContainer.textContent?.toLowerCase()).not.toContain("cohort");
  });

  it("updates its text when the cohortLabel prop changes", () => {
    const { rerender } = render(<PromptLine cohortLabel={null} />);
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      "$ claude-hunt ls --sort=votes"
    );

    rerender(<PromptLine cohortLabel="인프런" />);
    expect(screen.getByTestId("prompt-line")).toHaveTextContent(
      `$ claude-hunt ls --class="인프런" --sort=votes`
    );
  });
});
