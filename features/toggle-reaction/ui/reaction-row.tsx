"use client";

import { REACTION_EMOJI, type ReactionEmoji } from "@entities/reaction";
import { RiEmotionHappyLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/popover";
import { useRouter } from "next/navigation";
import {
  type RefObject,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
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

function applyOptimisticToggle(
  state: ReactionSummary[],
  emoji: ReactionEmoji
): ReactionSummary[] {
  const existing = state.find((r) => r.emoji === emoji);
  if (!existing) {
    return [...state, { emoji, count: 1, viewerReacted: true }];
  }
  if (existing.viewerReacted) {
    const nextCount = existing.count - 1;
    if (nextCount <= 0) {
      return state.filter((r) => r.emoji !== emoji);
    }
    return state.map((r) =>
      r.emoji === emoji ? { ...r, count: nextCount, viewerReacted: false } : r
    );
  }
  return state.map((r) =>
    r.emoji === emoji ? { ...r, count: r.count + 1, viewerReacted: true } : r
  );
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
  const [, startTransition] = useTransition();
  const [optimisticReactions, applyOptimistic] = useOptimistic(
    reactions,
    applyOptimisticToggle
  );
  const hasMountedRef = useRef(false);
  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  const byEmoji = new Map<ReactionEmoji, ReactionSummary>();
  for (const r of optimisticReactions) {
    byEmoji.set(r.emoji, r);
  }

  function handleSelect(emoji: ReactionEmoji) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setOpen(false);
    startTransition(async () => {
      applyOptimistic(emoji);
      const result = await toggleReaction({
        commentId,
        projectId,
        emoji,
      });
      if (!result.ok) {
        toast.error(result.error ?? "반응을 저장하지 못했어요.");
        return;
      }
      router.refresh();
    });
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
          <ReactionChip
            hasMountedRef={hasMountedRef}
            key={emoji}
            onSelect={handleSelect}
            summary={summary}
          />
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
                className="inline-flex size-7 items-center justify-center rounded-md text-base hover:bg-muted"
                data-testid="reaction-popover-emoji"
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

interface ReactionChipProps {
  hasMountedRef: RefObject<boolean>;
  onSelect: (emoji: ReactionEmoji) => void;
  summary: ReactionSummary;
}

function ReactionChip({ hasMountedRef, onSelect, summary }: ReactionChipProps) {
  const chipRef = useRef<HTMLButtonElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: hasMountedRef is a one-shot flag ref; ref mutations are not tracked by React deps.
  useEffect(() => {
    if (!hasMountedRef.current) {
      return;
    }
    if (summary.count <= 0) {
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    chipRef.current?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.18)" },
        { transform: "scale(1)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
    );
    countRef.current?.animate(
      [
        { transform: "translateY(4px)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: 200, easing: "ease-out" }
    );
  }, [summary.count]);

  return (
    <button
      aria-pressed={summary.viewerReacted}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        summary.viewerReacted
          ? "border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta"
          : "border-border bg-muted text-foreground hover:bg-muted/80"
      )}
      data-testid="reaction-chip"
      onClick={() => onSelect(summary.emoji)}
      ref={chipRef}
      type="button"
    >
      <span aria-hidden="true">{summary.emoji}</span>
      <span className="inline-block tabular-nums" ref={countRef}>
        {summary.count}
      </span>
    </button>
  );
}
