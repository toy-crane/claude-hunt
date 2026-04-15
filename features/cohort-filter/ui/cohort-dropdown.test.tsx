import type { Cohort } from "@entities/cohort";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CohortDropdown } from "./cohort-dropdown";

const cohorts: Cohort[] = [
  {
    id: "a1",
    name: "LGE-1",
    label: "LG전자 1기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
  {
    id: "b2",
    name: "LGE-2",
    label: "LG전자 2기",
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
  },
];

describe("CohortDropdown", () => {
  it("shows 'All cohorts' when value is null", () => {
    render(
      <CohortDropdown cohorts={cohorts} onValueChange={vi.fn()} value={null} />
    );
    expect(screen.getByTestId("cohort-dropdown")).toHaveTextContent(
      "모든 과정"
    );
  });

  it("shows the selected cohort's label when a cohort id is provided", () => {
    render(
      <CohortDropdown cohorts={cohorts} onValueChange={vi.fn()} value="a1" />
    );
    expect(screen.getByTestId("cohort-dropdown")).toHaveTextContent(
      "LG전자 1기"
    );
  });

  it("calls onValueChange with the cohort id when a cohort is selected", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CohortDropdown
        cohorts={cohorts}
        onValueChange={onValueChange}
        value={null}
      />
    );

    await user.click(screen.getByTestId("cohort-dropdown"));
    await user.click(await screen.findByRole("option", { name: "LG전자 1기" }));

    expect(onValueChange).toHaveBeenCalledWith("a1");
  });

  it("calls onValueChange with null when 'All cohorts' is selected", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CohortDropdown
        cohorts={cohorts}
        onValueChange={onValueChange}
        value="a1"
      />
    );

    await user.click(screen.getByTestId("cohort-dropdown"));
    await user.click(await screen.findByRole("option", { name: "모든 과정" }));

    expect(onValueChange).toHaveBeenCalledWith(null);
  });
});
