"use client";

import { REACTION_EMOJI, type ReactionEmoji } from "@entities/reaction";
import { RiEmotionHappyLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/popover";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { toggleReaction } from "../api/actions";

export interface ReactionSummary {
  count: number;
  emoji: ReactionEmoji;
  viewerReacted: boolean;
}

export interface ReactionRowProps {
  commentId: string;
  isAuthenticated: boolean;
  projectId: string;
  reactions: ReactionSummary[];
}

/**
 * Slack/Reddit-style reaction row. Filled chips render only for
 * emojis with count >= 1 (own reactions get an accent background).
 * The "+ React" trigger opens a popover with the four allowed
 * emojis. Anonymous visitors are sent to /login when they tap any
 * reaction control.
 */
export function ReactionRow({
  commentId,
  projectId,
  isAuthenticated,
  reactions,
}: ReactionRowProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const byEmoji = new Map<ReactionEmoji, ReactionSummary>();
  for (const r of reactions) {
    byEmoji.set(r.emoji, r);
  }

  async function handleSelect(emoji: ReactionEmoji) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setPending(true);
    try {
      const result = await toggleReaction({
        commentId,
        projectId,
        emoji,
      });
      if (!result.ok) {
        toast.error(result.error ?? "반응을 저장하지 못했어요.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const visibleChips = REACTION_EMOJI.filter((e) => {
    const summary = byEmoji.get(e);
    return summary && summary.count > 0;
  });
  const hasAny = visibleChips.length > 0;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      data-testid="reaction-row"
    >
      {visibleChips.map((emoji) => {
        const summary = byEmoji.get(emoji);
        if (!summary) {
          return null;
        }
        return (
          <button
            aria-pressed={summary.viewerReacted}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
              summary.viewerReacted
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-muted text-foreground hover:bg-muted/80"
            )}
            data-testid="reaction-chip"
            disabled={pending}
            key={emoji}
            onClick={() => handleSelect(emoji)}
            type="button"
          >
            <span aria-hidden="true">{emoji}</span>
            <span>{summary.count}</span>
          </button>
        );
      })}
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <button
            aria-label="반응 추가"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-muted-foreground text-xs hover:text-foreground"
            )}
            data-testid="reaction-add-trigger"
            disabled={pending}
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                router.push("/login");
              }
            }}
            type="button"
          >
            <RiEmotionHappyLine className="size-3" />
            {hasAny ? null : <span>반응</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1">
          <div className="flex items-center gap-1">
            {REACTION_EMOJI.map((emoji) => (
              <button
                aria-label={`${emoji} 반응`}
                className="inline-flex size-9 items-center justify-center rounded-md text-lg hover:bg-muted"
                data-testid="reaction-popover-emoji"
                disabled={pending}
                key={emoji}
                onClick={() => handleSelect(emoji)}
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
