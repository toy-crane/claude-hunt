import type { Cohort } from "@entities/cohort";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CohortCombobox } from "./cohort-combobox";

const ALL_CLASSES = /모든 클래스/;
const LGE_1 = /LG전자 1기/;
const LGE_2 = /LG전자 2기/;
const INFLEARN = /인프런/;
const ENGLISH_COHORT = /cohort/i;
const SEARCH_PLACEHOLDER = "클래스 검색…";

const cohorts: Cohort[] = [
  {
    id: "c1",
    name: "LGE-1",
    label: "LG전자 1기",
    display_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c2",
    name: "LGE-2",
    label: "LG전자 2기",
    display_order: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c3",
    name: "Inflearn",
    label: "인프런",
    display_order: 3,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const counts = { c1: 6, c2: 4, c3: 1 };

function renderCombobox(
  props: Partial<React.ComponentProps<typeof CohortCombobox>> = {}
) {
  const onValueChange = vi.fn();
  render(
    <CohortCombobox
      allCount={11}
      cohorts={cohorts}
      counts={counts}
      onValueChange={onValueChange}
      value={null}
      {...props}
    />
  );
  return { onValueChange };
}

function trigger() {
  return screen.getByTestId("cohort-combobox-trigger");
}

describe("CohortCombobox", () => {
  it("shows '모든 클래스' on the trigger when nothing is selected", () => {
    renderCombobox();
    expect(trigger()).toHaveTextContent("클래스:모든 클래스");
  });

  it("shows the selected class label on the trigger", () => {
    renderCombobox({ value: "c2" });
    expect(trigger()).toHaveTextContent("클래스:LG전자 2기");
  });

  it("opens the class list and focuses the search box", async () => {
    const user = userEvent.setup();
    renderCombobox();
    await user.click(trigger());

    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveFocus();
    expect(screen.getByRole("option", { name: ALL_CLASSES })).toBeVisible();
    expect(screen.getByRole("option", { name: LGE_1 })).toBeVisible();
  });

  it("lists each class with its project count", async () => {
    const user = userEvent.setup();
    renderCombobox();
    await user.click(trigger());

    expect(
      within(screen.getByRole("option", { name: ALL_CLASSES })).getByText("11")
    ).toBeVisible();
    expect(
      within(screen.getByRole("option", { name: LGE_1 })).getByText("6")
    ).toBeVisible();
    expect(
      within(screen.getByRole("option", { name: INFLEARN })).getByText("1")
    ).toBeVisible();
  });

  it("narrows the list to classes matching the search, keeping their order", async () => {
    const user = userEvent.setup();
    renderCombobox();
    await user.click(trigger());
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "LG전자");

    const names = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(names).toEqual([
      expect.stringContaining("모든 클래스"),
      expect.stringContaining("LG전자 1기"),
      expect.stringContaining("LG전자 2기"),
    ]);
    expect(screen.queryByRole("option", { name: INFLEARN })).toBeNull();
  });

  it("keeps '모든 클래스' available while searching so the filter can be cleared", async () => {
    const user = userEvent.setup();
    renderCombobox({ value: "c1" });
    await user.click(trigger());
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "인프런");

    expect(screen.getByRole("option", { name: ALL_CLASSES })).toBeVisible();
    expect(screen.queryByRole("option", { name: LGE_1 })).toBeNull();
  });

  it("tells the reader when nothing matches the search", async () => {
    const user = userEvent.setup();
    renderCombobox();
    await user.click(trigger());
    await user.type(
      screen.getByPlaceholderText(SEARCH_PLACEHOLDER),
      "없는수업"
    );

    expect(screen.getByText("찾는 클래스가 없어요.")).toBeVisible();
  });

  it("reports the chosen class and closes", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCombobox();
    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: LGE_2 }));

    expect(onValueChange).toHaveBeenCalledWith("c2");
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull();
  });

  it("reports null when '모든 클래스' is chosen", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderCombobox({ value: "c1" });
    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: ALL_CLASSES }));

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("marks only the selected class as chosen", async () => {
    const user = userEvent.setup();
    renderCombobox({ value: "c1" });
    await user.click(trigger());

    expect(screen.getByRole("option", { name: LGE_1 })).toHaveAttribute(
      "data-checked",
      "true"
    );
    expect(screen.getByRole("option", { name: LGE_2 })).toHaveAttribute(
      "data-checked",
      "false"
    );
    expect(screen.getByRole("option", { name: ALL_CLASSES })).toHaveAttribute(
      "data-checked",
      "false"
    );
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderCombobox();
    await user.click(trigger());
    await user.keyboard("{Escape}");

    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull();
  });

  it("starts from an empty search each time it opens", async () => {
    const user = userEvent.setup();
    renderCombobox();
    await user.click(trigger());
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "인프런");
    await user.keyboard("{Escape}");
    await user.click(trigger());

    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("");
    expect(screen.getByRole("option", { name: LGE_1 })).toBeVisible();
  });

  it("never shows the English word 'cohort' to the reader", async () => {
    const user = userEvent.setup();
    render(
      <CohortCombobox
        allCount={11}
        cohorts={cohorts}
        counts={counts}
        onValueChange={() => {
          /* noop */
        }}
        value={null}
      />
    );
    await user.click(trigger());

    expect(document.body.textContent).not.toMatch(ENGLISH_COHORT);
  });
});
