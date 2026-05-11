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
  it("closes the confirm dialog and dispatches optimistic delete immediately on confirm", async () => {
    deleteComment.mockResolvedValue({ ok: true });
    const onOptimisticDelete = vi.fn();

    render(
      <CommentItem
        allowReply
        comment={baseComment}
        isAuthenticated
        onOptimisticDelete={onOptimisticDelete}
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

    // Optimistic UI: dialog closes immediately and the parent receives
    // the delete dispatch synchronously. CommentList absorbs the
    // dispatch via `useOptimistic` and removes the row before the
    // server roundtrip completes.
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(onOptimisticDelete).toHaveBeenCalledWith("c1");
    expect(deleteComment).toHaveBeenCalledWith({
      commentId: "c1",
      projectId: "p1",
    });
  });
});
