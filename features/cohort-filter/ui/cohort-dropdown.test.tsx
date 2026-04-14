import type { Cohort } from "@entities/cohort";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CohortDropdown } from "./cohort-dropdown";

const replaceMock = vi.fn();
const pathnameMock = vi.fn().mockReturnValue("/");
const searchParamsMock = vi.fn().mockReturnValue(new URLSearchParams());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameMock(),
  useSearchParams: () => searchParamsMock(),
}));

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
  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it("shows 'All cohorts' when no cohort is selected", () => {
    render(<CohortDropdown cohorts={cohorts} selectedCohortId={null} />);
    expect(screen.getByTestId("cohort-dropdown")).toHaveTextContent(
      "All cohorts"
    );
  });

  it("shows the selected cohort's label when one is active", () => {
    render(<CohortDropdown cohorts={cohorts} selectedCohortId="a1" />);
    expect(screen.getByTestId("cohort-dropdown")).toHaveTextContent(
      "LG전자 1기"
    );
  });

  it("navigates with ?cohort=<id> when a cohort is selected", async () => {
    const user = userEvent.setup();
    render(<CohortDropdown cohorts={cohorts} selectedCohortId={null} />);

    await user.click(screen.getByTestId("cohort-dropdown"));
    await user.click(await screen.findByRole("option", { name: "LG전자 1기" }));

    expect(replaceMock).toHaveBeenCalledWith("/?cohort=a1");
  });

  it("clears the cohort param when 'All cohorts' is selected", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("cohort=a1"));
    const user = userEvent.setup();
    render(<CohortDropdown cohorts={cohorts} selectedCohortId="a1" />);

    await user.click(screen.getByTestId("cohort-dropdown"));
    await user.click(
      await screen.findByRole("option", { name: "All cohorts" })
    );

    expect(replaceMock).toHaveBeenCalledWith("/");
  });
});
