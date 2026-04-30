"use client";

import { isCommentEdited } from "@entities/comment";
import { deleteComment } from "@features/delete-comment";
import { EditCommentInline } from "@features/edit-comment";
import { CommentForm } from "@features/leave-comment";
import { ReactionRow } from "@features/toggle-reaction";
import { RiMoreLine } from "@remixicon/react";
import { formatRelativeKo } from "@shared/lib/format-relative";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { CommentRow } from "../api/queries";

export interface CommentItemProps {
  /** Hides the "답글하기" button. Replies use this to enforce depth-1. */
  allowReply: boolean;
  comment: CommentRow;
  isAuthenticated: boolean;
  projectId: string;
  /** auth.uid() of the current viewer; controls the kebab menu. */
  viewerUserId: string | null;
}

export function CommentItem({
  comment,
  projectId,
  isAuthenticated,
  allowReply,
  viewerUserId,
}: CommentItemProps) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const author = comment.author_display_name ?? "익명";
  const initial = author.charAt(0);
  const submittedAt = formatRelativeKo(comment.created_at);
  const edited = isCommentEdited({
    created_at: comment.created_at,
    updated_at: comment.updated_at,
  });
  const isOwner = viewerUserId != null && viewerUserId === comment.user_id;

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      const result = await deleteComment({
        commentId: comment.id,
        projectId,
      });
      if (!result.ok) {
        toast.error(result.error ?? "삭제하지 못했어요.");
        return;
      }
      toast.success("댓글이 삭제됐어요.");
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

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
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
              <span className="font-medium text-foreground">{author}</span>
              <span aria-hidden="true">·</span>
              <span>{submittedAt}</span>
              {edited ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className="text-[11px] italic"
                    data-testid="comment-edited-tag"
                  >
                    수정됨
                  </span>
                </>
              ) : null}
            </div>
            {isOwner ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="더보기"
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="comment-kebab"
                >
                  <RiMoreLine />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={deleting}
                    onSelect={(e) => {
                      e.preventDefault();
                      setEditing(true);
                    }}
                  >
                    편집
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={deleting}
                    onSelect={(e) => {
                      e.preventDefault();
                      setConfirmOpen(true);
                    }}
                    variant="destructive"
                  >
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {editing ? (
            <EditCommentInline
              commentId={comment.id}
              initialBody={comment.body}
              onCancel={() => setEditing(false)}
              projectId={projectId}
            />
          ) : (
            <p
              className="whitespace-pre-line text-foreground text-sm leading-relaxed"
              data-testid="comment-body"
            >
              {comment.body}
            </p>
          )}
          {editing ? null : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ReactionRow
                commentId={comment.id}
                isAuthenticated={isAuthenticated}
                projectId={projectId}
                reactions={comment.reactions}
              />
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
          )}
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

      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 댓글을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              댓글에 달린 답글과 반응까지 함께 사라져요. 이 동작은 되돌릴 수
              없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
