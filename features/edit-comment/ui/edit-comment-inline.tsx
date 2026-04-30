"use client";

import { MAX_COMMENT_BODY } from "@entities/comment";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { editComment } from "../api/actions";

export interface EditCommentInlineProps {
  commentId: string;
  initialBody: string;
  onCancel: () => void;
  projectId: string;
}

export function EditCommentInline({
  commentId,
  projectId,
  initialBody,
  onCancel,
}: EditCommentInlineProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialBody);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const result = await editComment({
        commentId,
        projectId,
        body: value,
      });
      if (!result.ok) {
        setError(result.error ?? "수정하지 못했어요.");
        return;
      }
      toast.success("수정됐어요.");
      onCancel();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label="댓글 수정"
      className="flex flex-col gap-2"
      data-testid="edit-comment-inline"
      onSubmit={handleSubmit}
    >
      <Textarea
        autoFocus
        disabled={submitting}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
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
          <Button
            disabled={submitting}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            취소
          </Button>
          <Button
            disabled={submitting || !value.trim() || overLimit}
            size="sm"
            type="submit"
          >
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
