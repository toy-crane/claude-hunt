"use client";

import { MAX_COMMENT_BODY } from "@entities/comment";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { leaveComment } from "../api/actions";

export interface CommentFormProps {
  autoFocus?: boolean;
  isAuthenticated: boolean;
  /** Called when user clicks Cancel. Used by inline reply forms. */
  onCancel?: () => void;
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
}: CommentFormProps) {
  const textareaId = useId();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-md border border-dashed bg-muted/40 p-4 text-center text-muted-foreground text-sm"
        data-testid="comment-form-anon-prompt"
      >
        <Link className="underline" href="/login">
          로그인하고 의견 남기기
        </Link>
      </div>
    );
  }

  const overLimit = value.length > MAX_COMMENT_BODY;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!value.trim()) {
      return;
    }
    if (overLimit) {
      setError(`${MAX_COMMENT_BODY}자까지 작성할 수 있어요`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await leaveComment({
        projectId,
        parentCommentId,
        body: value,
      });
      if (!result.ok) {
        setError(result.error ?? "댓글을 등록하지 못했어요.");
        return;
      }
      setValue("");
      toast.success(
        parentCommentId ? "답글이 등록됐어요." : "댓글이 등록됐어요."
      );
      onCancel?.();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
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
        disabled={submitting}
        id={textareaId}
        onChange={(e) => setValue(e.target.value)}
        placeholder="의견을 남겨주세요"
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
              disabled={submitting}
              onClick={onCancel}
              size="sm"
              type="button"
              variant="ghost"
            >
              취소
            </Button>
          ) : null}
          <Button
            disabled={submitting || !value.trim() || overLimit}
            size="sm"
            type="submit"
          >
            {submitting ? "등록 중..." : "등록"}
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
