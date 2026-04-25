import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../api/actions", () => ({
  deleteProject: vi.fn(),
}));

const { DeleteButton } = await import("./delete-button");

describe("DeleteButton — default variant", () => {
  it("renders the labeled 삭제 button", () => {
    render(<DeleteButton projectId="p1" projectTitle="My App" />);
    const trigger = screen.getByTestId("delete-project-trigger");
    expect(trigger).toHaveTextContent("삭제");
  });
});

describe("DeleteButton — icon variant", () => {
  it("renders a square, icon-only button with a Korean aria-label", () => {
    render(
      <DeleteButton projectId="p1" projectTitle="My App" variant="icon" />
    );
    const trigger = screen.getByTestId("delete-project-trigger");
    expect(trigger).toHaveAttribute("aria-label", "프로젝트 삭제");
    expect(trigger).toHaveTextContent("");
    expect(trigger.className).toContain("rounded-none");
    expect(trigger.className).toContain("size-7");
  });

  it("opens the delete-confirmation dialog when the icon trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DeleteButton projectId="p1" projectTitle="My App" variant="icon" />
    );
    await user.click(screen.getByTestId("delete-project-trigger"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("프로젝트를 삭제할까요?")).toBeInTheDocument();
  });
});
