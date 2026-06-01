"use client";

import { CommentForm } from "@features/create-comment";
import type { Viewer } from "@shared/api/supabase/viewer";
import { Empty, EmptyHeader, EmptyTitle } from "@shared/ui/empty";
import { useOptimistic } from "react";
import type { CommentRow, CommentThread } from "../api/fetch-comment-threads";
import { CommentItem } from "./comment-item";

/**
 * Narrow slice of `Viewer` the list needs to author an optimistic
 * comment row (id for ownership checks, display name + avatar for the
 * author cell). Defined as a `Pick` so changes to `Viewer` propagate.
 */
export type CommentListViewer = Pick<
  Viewer,
  "id" | "displayName" | "avatarUrl"
>;

export interface CommentListProps {
  projectId: string;
  threads: CommentThread[];
  /** Signed-in viewer's profile slice, or null for anonymous. */
  viewer: CommentListViewer | null;
}

/**
 * Optimistic actions dispatched while a server action is in flight.
 * `useOptimistic` reconciles back to props once the transition ends, so
 * the server's revalidated threads always win.
 */
type CommentAction =
  | { type: "add"; thread: CommentThread }
  | { type: "reply"; parentId: string; reply: CommentRow }
  | { type: "edit"; commentId: string; body: string }
  | { type: "delete"; commentId: string };

function applyAction(
  state: CommentThread[],
  action: CommentAction
): CommentThread[] {
  switch (action.type) {
    case "add":
      return [action.thread, ...state];
    case "reply":
      return state.map((thread) =>
        thread.comment.id === action.parentId
          ? { ...thread, replies: [...thread.replies, action.reply] }
          : thread
      );
    case "edit": {
      const now = new Date().toISOString();
      return state.map((thread) => {
        if (thread.comment.id === action.commentId) {
          return {
            ...thread,
            comment: {
              ...thread.comment,
              body: action.body,
              updated_at: now,
            },
          };
        }
        if (thread.replies.some((r) => r.id === action.commentId)) {
          return {
            ...thread,
            replies: thread.replies.map((r) =>
              r.id === action.commentId
                ? { ...r, body: action.body, updated_at: now }
                : r
            ),
          };
        }
        return thread;
      });
    }
    case "delete":
      return state
        .filter((thread) => thread.comment.id !== action.commentId)
        .map((thread) => ({
          ...thread,
          replies: thread.replies.filter((r) => r.id !== action.commentId),
        }));
    default:
      return state;
  }
}

function buildOptimisticRow(
  id: string,
  body: string,
  viewer: CommentListViewer
): CommentRow {
  const now = new Date().toISOString();
  return {
    // Caller (CommentForm) supplies the id. The same id is sent to the
    // server so the row that comes back from revalidation has a
    // matching React key — the subtree stays mounted across the
    // optimistic → real transition.
    id,
    user_id: viewer.id,
    body,
    created_at: now,
    updated_at: now,
    author_display_name: viewer.displayName,
    author_avatar_url: viewer.avatarUrl,
    reactions: [],
  };
}

export function CommentList({ threads, projectId, viewer }: CommentListProps) {
  const [optimisticThreads, dispatch] = useOptimistic(threads, applyAction);
  const isAuthenticated = viewer !== null;
  const viewerUserId = viewer?.id ?? null;
  const total = optimisticThreads.reduce(
    (sum, t) => sum + 1 + t.replies.length,
    0
  );

  const onTopLevelSubmit = viewer
    ? (commentId: string, body: string) => {
        dispatch({
          type: "add",
          thread: {
            comment: buildOptimisticRow(commentId, body, viewer),
            replies: [],
          },
        });
      }
    : undefined;

  const onReplySubmit = viewer
    ? ({
        parentId,
        commentId,
        body,
      }: {
        body: string;
        commentId: string;
        parentId: string;
      }) => {
        dispatch({
          type: "reply",
          parentId,
          reply: buildOptimisticRow(commentId, body, viewer),
        });
      }
    : undefined;

  const onDelete = viewer
    ? (commentId: string) => {
        dispatch({ type: "delete", commentId });
      }
    : undefined;

  const onEdit = viewer
    ? (commentId: string, body: string) => {
        dispatch({ type: "edit", commentId, body });
      }
    : undefined;

  return (
    <section className="flex flex-col gap-4" data-testid="comment-list">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium text-base">
          댓글 <span className="text-muted-foreground">{total}</span>
        </h2>
      </div>

      <CommentForm
        isAuthenticated={isAuthenticated}
        onOptimisticSubmit={onTopLevelSubmit}
        projectId={projectId}
      />

      {optimisticThreads.length === 0 ? (
        <Empty className="border p-8" data-testid="comment-list-empty">
          <EmptyHeader>
            <EmptyTitle className="text-base">아직 댓글이 없어요</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y" data-testid="comment-list-items">
          {optimisticThreads.map((thread) => (
            <li
              className="flex flex-col gap-1"
              data-testid="comment-thread"
              key={thread.comment.id}
            >
              <CommentItem
                allowReply
                comment={thread.comment}
                isAuthenticated={isAuthenticated}
                onOptimisticDelete={onDelete}
                onOptimisticEdit={onEdit}
                onOptimisticReply={onReplySubmit}
                projectId={projectId}
                viewerUserId={viewerUserId}
              />
              {thread.replies.length > 0 ? (
                <ul
                  className="ml-9 flex flex-col gap-1 border-border border-l-2 pl-3"
                  data-testid="comment-reply-thread"
                >
                  {thread.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentItem
                        allowReply={false}
                        comment={reply}
                        isAuthenticated={isAuthenticated}
                        onOptimisticDelete={onDelete}
                        onOptimisticEdit={onEdit}
                        projectId={projectId}
                        viewerUserId={viewerUserId}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
