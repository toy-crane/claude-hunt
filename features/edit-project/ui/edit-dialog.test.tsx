import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../api/actions", () => ({
  editProject: vi.fn(),
}));

vi.mock("@shared/lib/screenshot-upload", () => ({
  uploadScreenshot: vi.fn(),
}));

const { EditDialog } = await import("./edit-dialog");

const project = {
  id: "proj-1",
  title: "My App",
  tagline: "A cool tool",
  project_url: "https://myapp.com",
};

describe("EditDialog — default variant", () => {
  it("renders the labeled 수정 button", () => {
    render(<EditDialog project={project} />);
    const trigger = screen.getByTestId("edit-project-trigger");
    expect(trigger).toHaveTextContent("수정");
  });
});

describe("EditDialog — icon variant", () => {
  it("renders a square, icon-only button with a Korean aria-label", () => {
    render(<EditDialog project={project} variant="icon" />);
    const trigger = screen.getByTestId("edit-project-trigger");
    expect(trigger).toHaveAttribute("aria-label", "프로젝트 편집");
    expect(trigger).toHaveTextContent("");
    expect(trigger.className).toContain("rounded-none");
    expect(trigger.className).toContain("size-7");
  });

  it("opens the same edit dialog when the icon trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<EditDialog project={project} variant="icon" />);
    await user.click(screen.getByTestId("edit-project-trigger"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 수정")).toBeInTheDocument();
  });
});
