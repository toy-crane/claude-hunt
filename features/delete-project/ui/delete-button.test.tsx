import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const deleteProject = vi.fn();
vi.mock("../api/actions", () => ({
  deleteProject,
}));

const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
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
    // Square sizing is DeleteButton's own contract; corner rounding is
    // governed globally by --radius:0, not by this component, so we don't
    // assert a specific rounded-* utility (it varies by shadcn preset).
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

describe("DeleteButton — confirm pending state", () => {
  it("shows a Spinner on the confirm button while pending and keeps the static label", async () => {
    deleteProject.mockImplementation(
      () => new Promise<{ ok: true }>(() => undefined)
    );
    const user = userEvent.setup();
    render(<DeleteButton projectId="p1" projectTitle="My App" />);

    await user.click(screen.getByTestId("delete-project-trigger"));
    await user.click(screen.getByTestId("delete-project-confirm"));

    await waitFor(() => {
      const button = screen.getByTestId(
        "delete-project-confirm"
      ) as HTMLButtonElement;
      expect(button).toBeDisabled();
      expect(button.querySelector('[role="status"]')).toBeInTheDocument();
      expect(button.textContent).toContain("삭제");
      expect(button.textContent).not.toContain("삭제 중");
    });
  });
});

describe("DeleteButton — post-delete refresh", () => {
  it("calls router.refresh() after a successful delete so server-rendered lists drop the row", async () => {
    deleteProject.mockResolvedValue({ ok: true });
    routerRefresh.mockClear();
    const user = userEvent.setup();
    render(<DeleteButton projectId="p1" projectTitle="My App" />);

    await user.click(screen.getByTestId("delete-project-trigger"));
    await user.click(screen.getByTestId("delete-project-confirm"));

    await waitFor(() => {
      expect(routerRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("does NOT call router.refresh() when the server action returns ok:false", async () => {
    deleteProject.mockResolvedValue({ ok: false, error: "forbidden" });
    routerRefresh.mockClear();
    const user = userEvent.setup();
    render(<DeleteButton projectId="p1" projectTitle="My App" />);

    await user.click(screen.getByTestId("delete-project-trigger"));
    await user.click(screen.getByTestId("delete-project-confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("delete-project-error")).toBeInTheDocument();
    });
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
