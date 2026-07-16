import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { startTransition } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommentRow, CommentThread } from "../api/fetch-comment-threads";

// jsdom has no matchMedia, so motion's useReducedMotion is overridden.
// Tests default to the reduced path (plain <li>s, synchronous removal)
// and flip `motionState.reduce = false` to exercise the animated tree.
const { motionState } = vi.hoisted(() => ({ motionState: { reduce: true } }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionState.reduce,
}));

const deleteComment = vi.fn();
vi.mock("@features/delete-comment", () => ({
  deleteComment,
}));

vi.mock("@features/edit-comment", () => ({
  EditCommentInline: () => <div data-testid="edit-comment-inline-stub" />,
}));

vi.mock("@features/create-comment", () => ({
  CommentForm: ({
    onOptimisticSubmit,
  }: {
    onOptimisticSubmit?: (id: string, body: string) => void;
  }) => (
    <button
      data-testid="comment-form-stub"
      onClick={() =>
        startTransition(async () => {
          onOptimisticSubmit?.("opt-1", "hello optimistic");
          // Keep the transition pending: React reverts optimistic state
          // back to props the moment the transition settles.
          await new Promise(() => {
            /* never settles */
          });
        })
      }
      type="button"
    >
      submit
    </button>
  ),
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

const { CommentList } = await import("./comment-list");

const DELETE_LABEL = /삭제/;

function makeComment(
  overrides: Partial<CommentRow> & { id: string }
): CommentRow {
  return {
    author_avatar_url: null,
    author_display_name: "Alice",
    body: `body of ${overrides.id}`,
    created_at: "2026-05-01T00:00:00Z",
    reactions: [],
    updated_at: "2026-05-01T00:00:00Z",
    user_id: "u1",
    ...overrides,
  };
}

const threads: CommentThread[] = [
  {
    comment: makeComment({ id: "c1", body: "first thread" }),
    replies: [makeComment({ id: "r1", body: "first reply", user_id: "u2" })],
  },
  {
    comment: makeComment({ id: "c2", body: "second thread", user_id: "u2" }),
    replies: [],
  },
];

const viewer = { id: "u1", displayName: "Alice", avatarUrl: null };

afterEach(() => {
  motionState.reduce = true;
  vi.clearAllMocks();
});

describe("<CommentList />", () => {
  it("renders every thread and reply as plain list items under reduced motion", () => {
    render(<CommentList projectId="p1" threads={threads} viewer={viewer} />);

    const rows = screen.getAllByTestId("comment-thread");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.tagName).toBe("LI");
    }
    const replyList = screen.getByTestId("comment-reply-thread");
    expect(within(replyList).getByText("first reply")).toBeInTheDocument();
  });

  it("keeps the list DOM structure and testids when motion is enabled", () => {
    motionState.reduce = false;
    render(<CommentList projectId="p1" threads={threads} viewer={viewer} />);

    const list = screen.getByTestId("comment-list-items");
    const rows = within(list).getAllByTestId("comment-thread");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.tagName).toBe("LI");
      expect(row.parentElement).toBe(list);
    }
    const replyList = within(rows[0] as HTMLElement).getByTestId(
      "comment-reply-thread"
    );
    expect(within(replyList).getByText("first reply")).toBeInTheDocument();
  });

  it("shows a new comment thread first in the list after optimistic submit", async () => {
    render(<CommentList projectId="p1" threads={threads} viewer={viewer} />);

    fireEvent.click(screen.getByTestId("comment-form-stub"));

    await screen.findByText("hello optimistic");
    const rows = screen.getAllByTestId("comment-thread");
    expect(rows).toHaveLength(3);
    expect(
      within(rows[0] as HTMLElement).getByText("hello optimistic")
    ).toBeInTheDocument();
  });

  it("removes a deleted thread from the list while the delete is in flight", async () => {
    deleteComment.mockReturnValue(
      new Promise(() => {
        /* keep the delete in flight */
      })
    );
    render(<CommentList projectId="p1" threads={threads} viewer={viewer} />);

    // Only c1 belongs to the viewer, so exactly one kebab renders.
    const user = userEvent.setup();
    await user.click(screen.getByTestId("comment-kebab"));
    await user.click(
      await screen.findByRole("menuitem", { name: DELETE_LABEL })
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: DELETE_LABEL }));

    await waitFor(() => {
      expect(screen.queryByText("first thread")).not.toBeInTheDocument();
    });
    expect(screen.getAllByTestId("comment-thread")).toHaveLength(1);
    expect(screen.queryByText("first reply")).not.toBeInTheDocument();
  });
});
