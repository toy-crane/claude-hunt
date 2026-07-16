import type { Cohort } from "@entities/cohort";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CohortSelect } from "./cohort-select";

// Newest class first, mirroring what `fetchCohorts` returns.
const COHORTS: Cohort[] = [
  {
    id: "c2",
    name: "LGE-2",
    label: "LG전자 2기",
    display_order: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c1",
    name: "LGE-1",
    label: "LG전자 1기",
    display_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c3",
    name: "TOYCRANE",
    label: "toycrane",
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const COUNTS = { c1: 3, c2: 9, c3: 1 };

const OPTION_LGE_1 = /LG전자 1기/;
const OPTION_ALL = /모든 클래스/;
const OPTION_TOYCRANE = /toycrane/;
const ENGLISH_COHORT = /cohort/i;

function renderSelect(overrides: Partial<Parameters<typeof CohortSelect>[0]>) {
  const onValueChange = vi.fn();
  render(
    <CohortSelect
      allCount={13}
      cohorts={COHORTS}
      counts={COUNTS}
      onValueChange={onValueChange}
      value={null}
      {...overrides}
    />
  );
  return { onValueChange };
}

describe("CohortSelect", () => {
  it("shows every class in a single control instead of one slot per class", () => {
    renderSelect({});

    // The whole point of the dropdown: the page footprint is one trigger,
    // no matter how many classes exist.
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("starts on 모든 클래스 with the total count when nothing is filtered", () => {
    renderSelect({ value: null });

    expect(screen.getByTestId("cohort-select-trigger")).toHaveTextContent(
      "모든 클래스"
    );
    expect(screen.getByTestId("cohort-select-trigger")).toHaveTextContent("13");
  });

  it("shows the selected class and its count in the trigger", () => {
    renderSelect({ value: "c2" });

    const trigger = screen.getByTestId("cohort-select-trigger");
    expect(trigger).toHaveTextContent("LG전자 2기");
    expect(trigger).toHaveTextContent("9");
  });

  it("lists 모든 클래스 first, then the classes in the given order", async () => {
    const user = userEvent.setup();
    renderSelect({});

    await user.click(screen.getByTestId("cohort-select-trigger"));

    const labels = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels).toEqual([
      "모든 클래스13",
      "LG전자 2기9",
      "LG전자 1기3",
      "toycrane1",
    ]);
  });

  it("reports the cohort id when a class is picked", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect({});

    await user.click(screen.getByTestId("cohort-select-trigger"));
    await user.click(await screen.findByRole("option", { name: OPTION_LGE_1 }));

    expect(onValueChange).toHaveBeenCalledWith("c1");
  });

  it("reports null — not the internal sentinel — when 모든 클래스 is picked", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect({ value: "c1" });

    await user.click(screen.getByTestId("cohort-select-trigger"));
    await user.click(await screen.findByRole("option", { name: OPTION_ALL }));

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("shows a zero count for a class that has no projects yet", async () => {
    const user = userEvent.setup();
    renderSelect({ counts: { c1: 3, c2: 9 } });

    await user.click(screen.getByTestId("cohort-select-trigger"));

    const toycrane = await screen.findByRole("option", {
      name: OPTION_TOYCRANE,
    });
    expect(within(toycrane).getByText("0")).toBeInTheDocument();
  });

  it("labels the control in Korean and never says cohort", () => {
    renderSelect({});

    expect(
      screen.getByRole("combobox", { name: "클래스로 필터" })
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(ENGLISH_COHORT);
  });
});
