import type { Cohort } from "@entities/cohort/index.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CohortDropdown } from "./cohort-dropdown.tsx";

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
    name: "Cohort A",
    created_at: "2026-04-14T00:00:00Z",
  },
  {
    id: "b2",
    name: "Cohort B",
    created_at: "2026-04-14T00:00:00Z",
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

  it("shows the selected cohort's name when one is active", () => {
    render(<CohortDropdown cohorts={cohorts} selectedCohortId="a1" />);
    expect(screen.getByTestId("cohort-dropdown")).toHaveTextContent("Cohort A");
  });

  it("navigates with ?cohort=<id> when a cohort is selected", async () => {
    const user = userEvent.setup();
    render(<CohortDropdown cohorts={cohorts} selectedCohortId={null} />);

    await user.click(screen.getByTestId("cohort-dropdown"));
    await user.click(await screen.findByRole("option", { name: "Cohort A" }));

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
