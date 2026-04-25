import type { Cohort } from "@entities/cohort";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CohortChips } from "./cohort-chips";

const ALL_CLASSES = /모든 클래스/;
const LGE_1 = /LG전자 1기/;
const LGE_2 = /LG전자 2기/;
const INFLEARN = /인프런/;

const cohorts: Cohort[] = [
  {
    id: "c1",
    name: "LGE-1",
    label: "LG전자 1기",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c2",
    name: "LGE-2",
    label: "LG전자 2기",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c3",
    name: "Inflearn",
    label: "인프런",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("CohortChips", () => {
  it("renders '모든 클래스' first, then each cohort in the supplied order", () => {
    render(
      <CohortChips
        allCount={11}
        cohorts={cohorts}
        counts={{ c1: 6, c2: 4, c3: 1 }}
        onValueChange={() => {
          /* noop */
        }}
        value={null}
      />
    );
    const buttons = within(screen.getByTestId("cohort-chips")).getAllByRole(
      "button"
    );
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent("모든 클래스");
    expect(buttons[1]).toHaveTextContent("LG전자 1기");
    expect(buttons[2]).toHaveTextContent("LG전자 2기");
    expect(buttons[3]).toHaveTextContent("인프런");
  });

  it("shows the count next to each chip label", () => {
    render(
      <CohortChips
        allCount={11}
        cohorts={cohorts}
        counts={{ c1: 6, c2: 4, c3: 1 }}
        onValueChange={() => {
          /* noop */
        }}
        value={null}
      />
    );
    expect(
      within(screen.getByRole("button", { name: ALL_CLASSES })).getByText("11")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: LGE_1 })).getByText("6")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: INFLEARN })).getByText("1")
    ).toBeInTheDocument();
  });

  it("applies aria-pressed and inverted colors to the selected chip only", () => {
    render(
      <CohortChips
        allCount={11}
        cohorts={cohorts}
        counts={{ c1: 6, c2: 4, c3: 1 }}
        onValueChange={() => {
          /* noop */
        }}
        value="c2"
      />
    );
    const selected = screen.getByRole("button", { name: LGE_2 });
    const unselected = screen.getByRole("button", { name: ALL_CLASSES });

    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected.className).toContain("bg-foreground");
    expect(selected.className).toContain("text-background");

    expect(unselected).toHaveAttribute("aria-pressed", "false");
    expect(unselected.className).toContain("bg-background");
    expect(unselected.className).toContain("text-foreground");
  });

  it("fires onValueChange(null) when the 모든 클래스 chip is clicked", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CohortChips
        allCount={11}
        cohorts={cohorts}
        counts={{ c1: 6, c2: 4, c3: 1 }}
        onValueChange={onValueChange}
        value="c1"
      />
    );
    await user.click(screen.getByRole("button", { name: ALL_CLASSES }));
    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("fires onValueChange(cohort.id) when a class chip is clicked", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CohortChips
        allCount={11}
        cohorts={cohorts}
        counts={{ c1: 6, c2: 4, c3: 1 }}
        onValueChange={onValueChange}
        value={null}
      />
    );
    await user.click(screen.getByRole("button", { name: INFLEARN }));
    expect(onValueChange).toHaveBeenCalledWith("c3");
  });

  it("does not render the English word 'cohort' in any chip label", () => {
    render(
      <CohortChips
        allCount={11}
        cohorts={cohorts}
        counts={{ c1: 6, c2: 4, c3: 1 }}
        onValueChange={() => {
          /* noop */
        }}
        value={null}
      />
    );
    const root = screen.getByTestId("cohort-chips");
    expect(root.textContent?.toLowerCase()).not.toContain("cohort");
  });

  it("uses the Korean term 클래스 in the aria-label for assistive tech", () => {
    render(
      <CohortChips
        allCount={11}
        cohorts={cohorts}
        counts={{ c1: 6, c2: 4, c3: 1 }}
        onValueChange={() => {
          /* noop */
        }}
        value={null}
      />
    );
    expect(screen.getByRole("navigation")).toHaveAttribute(
      "aria-label",
      "클래스로 필터"
    );
  });
});
