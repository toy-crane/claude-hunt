import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CommentRow } from "../api/queries";

const deleteComment = vi.fn();
vi.mock("@features/delete-comment", () => ({
  deleteComment,
}));

vi.mock("@features/edit-comment", () => ({
  EditCommentInline: () => <div data-testid="edit-comment-inline-stub" />,
}));

vi.mock("@features/leave-comment", () => ({
  CommentForm: () => <div data-testid="comment-form-stub" />,
}));

vi.mock("@features/toggle-reaction", () => ({
  ReactionRow: () => <div data-testid="reaction-row-stub" />,
}));

vi.mock("@shared/lib/format-relative", () => ({
  formatRelativeKo: () => "방금 전",
}));

const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { CommentItem } = await import("./comment-item");

const DELETE_LABEL = /삭제/;

const baseComment: CommentRow = {
  author_avatar_url: null,
  author_display_name: "Alice",
  body: "Nice work!",
  created_at: "2026-05-01T00:00:00Z",
  id: "c1",
  reactions: [],
  updated_at: "2026-05-01T00:00:00Z",
  user_id: "u1",
};

describe("<CommentItem />", () => {
  it("shows a Spinner on the delete confirm button while pending and keeps the static label", async () => {
    deleteComment.mockImplementation(
      () => new Promise<{ ok: true }>(() => undefined)
    );

    render(
      <CommentItem
        allowReply
        comment={baseComment}
        isAuthenticated
        projectId="p1"
        viewerUserId="u1"
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("comment-kebab"));
    await user.click(
      await screen.findByRole("menuitem", { name: DELETE_LABEL })
    );

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
