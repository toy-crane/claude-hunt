"use client";

import { isCommentEdited } from "@entities/comment";
import { CommentForm } from "@features/leave-comment";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar";
import { useState } from "react";
import type { CommentRow } from "../api/queries";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatRelative(iso: string): string {
  if (!iso) {
    return "";
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }
  const diff = Math.max(0, Date.now() - then);
  const days = Math.floor(diff / DAY_MS);
  if (days > 0) {
    return `${days}일 전`;
  }
  const hours = Math.floor(diff / HOUR_MS);
  if (hours > 0) {
    return `${hours}시간 전`;
  }
  const mins = Math.floor(diff / MINUTE_MS);
  if (mins > 0) {
    return `${mins}분 전`;
  }
  return "방금";
}

export interface CommentItemProps {
  /** Hides the "답글하기" button. Replies use this to enforce depth-1. */
  allowReply: boolean;
  comment: CommentRow;
  isAuthenticated: boolean;
  projectId: string;
}

export function CommentItem({
  comment,
  projectId,
  isAuthenticated,
  allowReply,
}: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const author = comment.author_display_name ?? "익명";
  const initial = author.charAt(0);
  const submittedAt = formatRelative(comment.created_at);
  const edited = isCommentEdited({
    created_at: comment.created_at,
    updated_at: comment.updated_at,
  });

  return (
    <article className="flex flex-col gap-2 py-3" data-testid="comment-item">
      <div className="flex items-start gap-3">
        <Avatar className="size-7">
          {comment.author_avatar_url ? (
            <AvatarImage alt={author} src={comment.author_avatar_url} />
          ) : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <span className="font-medium text-foreground">{author}</span>
            <span>·</span>
            <span>{submittedAt}</span>
            {edited ? (
              <>
                <span>·</span>
                <span
                  className="text-[11px] italic"
                  data-testid="comment-edited-tag"
                >
                  수정됨
                </span>
              </>
            ) : null}
          </div>
          <p
            className="whitespace-pre-line text-foreground text-sm leading-relaxed"
            data-testid="comment-body"
          >
            {comment.body}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span aria-hidden="true" />
            {allowReply ? (
              <button
                className="text-muted-foreground text-xs underline underline-offset-2 hover:text-foreground"
                data-testid="comment-reply-trigger"
                onClick={() => setReplyOpen((v) => !v)}
                type="button"
              >
                {replyOpen ? "답글 닫기" : "답글하기"}
              </button>
            ) : null}
          </div>
          {replyOpen ? (
            <div className="mt-1">
              <CommentForm
                autoFocus
                isAuthenticated={isAuthenticated}
                onCancel={() => setReplyOpen(false)}
                parentCommentId={comment.id}
                projectId={projectId}
                size="compact"
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
