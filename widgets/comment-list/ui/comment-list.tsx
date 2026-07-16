"use client";

import { CommentForm } from "@features/create-comment";
import type { Viewer } from "@shared/api/supabase/viewer";
import { cn } from "@shared/lib/utils";
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { type ReactNode, useOptimistic } from "react";
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

/**
 * Enter rises into place from 4px above (the row arrives from the form
 * above it); exit collapses the row's height so siblings settle with it
 * instead of jumping. divide-y's 1px border is not part of height, so
 * it must collapse alongside.
 */
const rowVariants: Variants = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    height: 0,
    borderTopWidth: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

/**
 * Reduced motion keeps the fade and the height collapse — the collapse is what
 * stops the surrounding rows teleporting — and drops only the vertical travel.
 *
 * `animate` must stay identical to rowVariants.animate. It is the state
 * AnimatePresence mounts a row at, and useReducedMotion() reads null (→ false)
 * on the server, so the server always renders the not-reduced branch. Any
 * difference in the resting state would reach a reduced-motion browser as a
 * hydration mismatch, which React reports but does not patch up.
 */
const reducedRowVariants: Variants = {
  ...rowVariants,
  initial: { opacity: 0, y: 0 },
};

const rowTransition: Transition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] };

interface RowProps {
  children: ReactNode;
  className?: string;
  testId?: string;
}

/**
 * Animated list row. Always a motion.li, never a plain <li>: switching the
 * element type on a client-only preference would diverge from the server's
 * markup, and a plain <li> cannot signal exit completion to AnimatePresence
 * anyway. Reduced motion varies the variant values instead.
 */
function Row({ children, className, testId }: RowProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      animate="animate"
      className={cn(className, "overflow-hidden")}
      data-testid={testId}
      exit="exit"
      initial="initial"
      transition={rowTransition}
      variants={reduceMotion ? reducedRowVariants : rowVariants}
    >
      {children}
    </motion.li>
  );
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

      {/* Both lists stay mounted even while empty. Gating a list on its own
          length would unmount the AnimatePresence inside it on the very render
          that empties it — taking the last row's exit with it — and would mount
          a fresh one when the first row arrives, which `initial={false}` then
          treats as already-present and never animates in. `empty:hidden` keeps
          a childless list out of the layout instead. */}
      <ul
        className="flex flex-col divide-y empty:hidden"
        data-testid="comment-list-items"
      >
        <AnimatePresence initial={false}>
          {optimisticThreads.map((thread) => (
            <Row
              className="flex flex-col gap-1"
              key={thread.comment.id}
              testId="comment-thread"
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
              <ul
                className="ml-9 flex flex-col gap-1 border-border border-l-2 pl-3 empty:hidden"
                data-testid="comment-reply-thread"
              >
                <AnimatePresence initial={false}>
                  {thread.replies.map((reply) => (
                    <Row key={reply.id}>
                      <CommentItem
                        allowReply={false}
                        comment={reply}
                        isAuthenticated={isAuthenticated}
                        onOptimisticDelete={onDelete}
                        onOptimisticEdit={onEdit}
                        projectId={projectId}
                        viewerUserId={viewerUserId}
                      />
                    </Row>
                  ))}
                </AnimatePresence>
              </ul>
            </Row>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
