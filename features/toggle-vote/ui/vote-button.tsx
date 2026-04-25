"use client";

import { RiArrowUpFill, RiArrowUpLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleVote } from "../api/actions";

const ARIA_LABEL = "추천하기";

const STACKED_BASE_CLASS =
  "inline-flex flex-col items-center justify-center min-w-14 gap-0.5 rounded-md border px-2 py-2 text-sm font-semibold leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60";

const INLINE_BASE_CLASS =
  "inline-flex flex-row items-center justify-center gap-1.5 rounded-none border h-8 px-3 font-mono text-xs font-semibold leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60";

const IDLE_COLORS =
  "border-border bg-background text-foreground hover:bg-muted";

const VOTED_COLORS =
  "border-primary bg-primary text-primary-foreground hover:bg-primary/90";

const STACKED_OWNER_CLASS =
  "inline-flex min-w-14 flex-col items-center justify-center gap-0.5 rounded-md border border-transparent px-2 py-2 font-semibold text-muted-foreground text-sm leading-none";

const INLINE_OWNER_CLASS =
  "inline-flex flex-row items-center justify-center gap-1.5 rounded-none border border-transparent h-8 px-3 font-mono text-xs font-semibold leading-none text-muted-foreground";

export type VoteButtonVariant = "stacked" | "inline";

export interface VoteButtonProps {
  /** True when a signed-in viewer has already voted. */
  alreadyVoted: boolean;
  /** True when the viewer is authenticated. False → routes to /login on click. */
  isAuthenticated: boolean;
  /** True when the viewer is the owner — upvote hidden entirely. */
  ownedByViewer: boolean;
  projectId: string;
  /**
   * Visual layout variant. `"stacked"` (default) is the legacy pill with
   * the icon stacked over the count. `"inline"` is a compact horizontal,
   * square-cornered variant used inside the terminal-board row list.
   */
  variant?: VoteButtonVariant;
  voteCount: number;
}

export function VoteButton({
  projectId,
  voteCount,
  ownedByViewer,
  alreadyVoted,
  isAuthenticated,
  variant = "stacked",
}: VoteButtonProps) {
  const [optimisticVoted, setOptimisticVoted] = useState(alreadyVoted);
  const [optimisticCount, setOptimisticCount] = useState(voteCount);
  const [isPending, startTransition] = useTransition();

  const baseClass =
    variant === "inline" ? INLINE_BASE_CLASS : STACKED_BASE_CLASS;
  const ownerClass =
    variant === "inline" ? INLINE_OWNER_CLASS : STACKED_OWNER_CLASS;
  const iconSize = variant === "inline" ? "size-3.5" : "size-4";

  if (ownedByViewer) {
    return (
      <div className={ownerClass} data-testid="vote-owner-count">
        <RiArrowUpLine aria-hidden="true" className={iconSize} />
        <span className="sr-only">추천 수</span>
        <span className="tabular-nums">{voteCount}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        aria-label={ARIA_LABEL}
        className={cn(baseClass, IDLE_COLORS)}
        data-testid="vote-button-signin"
        href="/login"
      >
        <RiArrowUpLine aria-hidden="true" className={iconSize} />
        <span className="tabular-nums">{voteCount}</span>
      </Link>
    );
  }

  function handleClick() {
    const nextVoted = !optimisticVoted;
    setOptimisticVoted(nextVoted);
    setOptimisticCount((prev) => prev + (nextVoted ? 1 : -1));
    startTransition(async () => {
      const result = await toggleVote(projectId);
      if (!result.ok) {
        setOptimisticVoted((prev) => !prev);
        setOptimisticCount((prev) => prev + (nextVoted ? -1 : 1));
      }
    });
  }

  return (
    <button
      aria-label={ARIA_LABEL}
      aria-pressed={optimisticVoted}
      className={cn(baseClass, optimisticVoted ? VOTED_COLORS : IDLE_COLORS)}
      data-testid={optimisticVoted ? "vote-button-voted" : "vote-button-idle"}
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {optimisticVoted ? (
        <RiArrowUpFill aria-hidden="true" className={iconSize} />
      ) : (
        <RiArrowUpLine aria-hidden="true" className={iconSize} />
      )}
      <span className="tabular-nums">{optimisticCount}</span>
    </button>
  );
}
