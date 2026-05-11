import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const editComment = vi.fn();
vi.mock("../api/actions", () => ({
  editComment,
}));

const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { EditCommentInline } = await import("./edit-comment-inline");

const SAVE_LABEL = /저장/;

describe("<EditCommentInline />", () => {
  it("shows a Spinner on the Save button while pending and keeps the static label", async () => {
    editComment.mockImplementation(
      () => new Promise<{ ok: true }>(() => undefined)
    );
    const user = userEvent.setup();
    render(
      <EditCommentInline
        commentId="c1"
        initialBody="hello"
        onCancel={vi.fn()}
        projectId="p1"
      />
    );

    await user.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: SAVE_LABEL });
      expect(button).toBeDisabled();
      expect(button.querySelector('[role="status"]')).toBeInTheDocument();
      expect(button.textContent).toContain("저장");
      expect(button.textContent).not.toContain("저장 중");
    });
  });
});
