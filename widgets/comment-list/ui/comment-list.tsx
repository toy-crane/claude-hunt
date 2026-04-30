import { CommentForm } from "@features/leave-comment";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@shared/ui/empty";
import type { CommentThread } from "../api/queries";
import { CommentItem } from "./comment-item";

export interface CommentListProps {
  isAuthenticated: boolean;
  projectId: string;
  threads: CommentThread[];
}

export function CommentList({
  threads,
  projectId,
  isAuthenticated,
}: CommentListProps) {
  const total = threads.reduce((sum, t) => sum + 1 + t.replies.length, 0);

  return (
    <section className="flex flex-col gap-4" data-testid="comment-list">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-medium text-base">
          댓글 <span className="text-muted-foreground">{total}</span>
        </h2>
      </div>

      <CommentForm isAuthenticated={isAuthenticated} projectId={projectId} />

      {threads.length === 0 ? (
        <Empty className="border" data-testid="comment-list-empty">
          <EmptyHeader>
            <EmptyTitle>아직 댓글이 없어요</EmptyTitle>
            <EmptyDescription>첫 의견을 남겨주세요.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y" data-testid="comment-list-items">
          {threads.map((thread) => (
            <li
              className="flex flex-col gap-1"
              data-testid="comment-thread"
              key={thread.comment.id}
            >
              <CommentItem
                allowReply
                comment={thread.comment}
                isAuthenticated={isAuthenticated}
                projectId={projectId}
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
                        projectId={projectId}
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
