"use client";

import { MAX_COMMENT_BODY } from "@entities/comment";
import { Button } from "@shared/ui/button";
import { Spinner } from "@shared/ui/spinner";
import { Textarea } from "@shared/ui/textarea";
import Link from "next/link";
import posthog from "posthog-js";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { createComment } from "../api/actions";

export interface CommentFormProps {
  autoFocus?: boolean;
  isAuthenticated: boolean;
  /** Called when user clicks Cancel. Used by inline reply forms. */
  onCancel?: () => void;
  /**
   * Fires synchronously before the server action with the client-
   * generated comment id and body, so the parent list can push an
   * optimistic comment into the rendered tree. The same id is passed
   * to the server so the React key stays stable across the
   * optimistic → revalidated transition.
   */
  onOptimisticSubmit?: (commentId: string, body: string) => void;
  /** When set, this form posts as a reply to that comment. */
  parentCommentId?: string;
  projectId: string;
  /** Variant for inline reply forms — denser layout. */
  size?: "default" | "compact";
}

export function CommentForm({
  projectId,
  isAuthenticated,
  parentCommentId,
  size = "default",
  onCancel,
  autoFocus = false,
  onOptimisticSubmit,
}: CommentFormProps) {
  const textareaId = useId();
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-md border border-dashed bg-muted/40 p-4 text-center text-muted-foreground text-sm"
        data-testid="comment-form-anon-prompt"
      >
        <Link className="underline" href="/login">
          로그인하고 댓글 남기기
        </Link>
      </div>
    );
  }

  const overLimit = value.length > MAX_COMMENT_BODY;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!value.trim()) {
      return;
    }
    if (overLimit) {
      setError(`${MAX_COMMENT_BODY}자까지 쓸 수 있어요.`);
      return;
    }
    const body = value;
    const optimisticId = crypto.randomUUID();
    // Clear the textarea immediately so it doesn't block the optimistic
    // comment from appearing — the input is captured in `body`.
    setValue("");
    startTransition(async () => {
      // Synchronously push the optimistic comment into the list before
      // we wait on the server. The same id is passed to the server so
      // when revalidation lands the row, its React key matches the
      // optimistic one and the rendered subtree isn't torn down.
      onOptimisticSubmit?.(optimisticId, body);
      const result = await createComment({
        projectId,
        parentCommentId,
        body,
        optimisticId,
      });
      if (!result.ok) {
        setError(
          result.error ??
            "댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요."
        );
        setValue(body);
        return;
      }
      toast.success(
        parentCommentId ? "답글을 등록했어요." : "댓글을 등록했어요."
      );
      posthog.capture("comment_created", {
        project_id: projectId,
        is_reply: Boolean(parentCommentId),
        body_length: body.length,
      });
      onCancel?.();
    });
  }

  return (
    <form
      aria-label={parentCommentId ? "답글 작성" : "댓글 작성"}
      className="flex flex-col gap-2"
      data-testid={parentCommentId ? "reply-form" : "comment-form"}
      onSubmit={handleSubmit}
    >
      <Textarea
        aria-label={parentCommentId ? "답글 내용" : "댓글 내용"}
        autoFocus={autoFocus}
        disabled={isPending}
        id={textareaId}
        onChange={(e) => setValue(e.target.value)}
        placeholder="댓글을 남겨 주세요"
        rows={size === "compact" ? 2 : 3}
        value={value}
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            overLimit
              ? "text-destructive text-xs"
              : "text-muted-foreground text-xs"
          }
        >
          {value.length} / {MAX_COMMENT_BODY}
        </span>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button
              disabled={isPending}
              onClick={onCancel}
              size="sm"
              type="button"
              variant="ghost"
            >
              취소
            </Button>
          ) : null}
          <Button
            disabled={isPending || !value.trim() || overLimit}
            size="sm"
            type="submit"
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            등록
          </Button>
        </div>
      </div>
      {error ? (
        <p
          className="text-destructive text-xs"
          data-testid="comment-form-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
