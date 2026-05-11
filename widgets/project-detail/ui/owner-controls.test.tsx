import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const deleteProject = vi.fn();
vi.mock("@features/delete-project", () => ({
  deleteProject,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const routerPush = vi.fn();
const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { OwnerControls } = await import("./owner-controls");

const DELETE_LABEL = /삭제/;

describe("<OwnerControls />", () => {
  it("shows a Spinner on the delete confirm button while pending and keeps the static label", async () => {
    deleteProject.mockImplementation(
      () => new Promise<{ ok: true }>(() => undefined)
    );
    render(<OwnerControls projectId="p1" projectTitle="My App" />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: DELETE_LABEL }));

    await waitFor(() => {
      const liveDialog = screen.getByRole("alertdialog");
      const button = within(liveDialog).getByRole("button", {
        name: DELETE_LABEL,
      });
      expect(button).toBeDisabled();
      expect(button.querySelector('[role="status"]')).toBeInTheDocument();
      expect(button.textContent).toContain("삭제");
      expect(button.textContent).not.toContain("삭제 중");
    });
  });
});
