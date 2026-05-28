import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Eyebrow } from "./eyebrow";

describe("Eyebrow", () => {
  it("renders the brand h1 and the month props in prompt and subtitle", () => {
    render(<Eyebrow monthLabel="2026년 5월" monthSlug="2026-05" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "이달의 클로드 헌트" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("claude-hunt show --top --month=2026-05")
    ).toBeInTheDocument();
    expect(screen.getByText("2026년 5월의 1위 프로젝트")).toBeInTheDocument();
  });

  it("reflects a different month when the fallback kicks in", () => {
    render(<Eyebrow monthLabel="2026년 4월" monthSlug="2026-04" />);

    expect(
      screen.getByText("claude-hunt show --top --month=2026-04")
    ).toBeInTheDocument();
    expect(screen.getByText("2026년 4월의 1위 프로젝트")).toBeInTheDocument();
  });
});
