"use client";

import { RiArrowUpFill, RiArrowUpLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleVote } from "../api/actions";

const ARIA_LABEL = "추천하기";

const PILL_BASE_CLASS =
  "inline-flex flex-col items-center justify-center min-w-14 gap-0.5 rounded-lg border px-2 py-2 font-semibold text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-vote/50 disabled:pointer-events-none";

const PILL_IDLE_CLASS = "border-vote bg-background text-vote hover:bg-vote/10";

const PILL_VOTED_CLASS =
  "border-vote bg-vote text-vote-foreground hover:bg-vote/90";

export interface VoteButtonProps {
  /** True when a signed-in viewer has already voted. */
  alreadyVoted: boolean;
  /** True when the viewer is authenticated. False → routes to /login on click. */
  isAuthenticated: boolean;
  /** True when the viewer is the owner — upvote hidden entirely. */
  ownedByViewer: boolean;
  projectId: string;
  voteCount: number;
}

export function VoteButton({
  projectId,
  voteCount,
  ownedByViewer,
  alreadyVoted,
  isAuthenticated,
}: VoteButtonProps) {
  const [optimisticVoted, setOptimisticVoted] = useState(alreadyVoted);
  const [optimisticCount, setOptimisticCount] = useState(voteCount);
  const [isPending, startTransition] = useTransition();

  if (ownedByViewer) {
    return (
      <div
        className="inline-flex min-w-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent px-2 py-2 font-semibold text-muted-foreground text-sm"
        data-testid="vote-owner-count"
      >
        <RiArrowUpLine aria-hidden="true" className="size-4" />
        <span className="sr-only">추천 수</span>
        <span className="tabular-nums">{voteCount}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        aria-label={ARIA_LABEL}
        className={cn(PILL_BASE_CLASS, PILL_IDLE_CLASS)}
        data-testid="vote-button-signin"
        href="/login"
      >
        <RiArrowUpLine aria-hidden="true" className="size-4" />
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
      className={cn(
        PILL_BASE_CLASS,
        optimisticVoted ? PILL_VOTED_CLASS : PILL_IDLE_CLASS,
        isPending && "opacity-60"
      )}
      data-testid={optimisticVoted ? "vote-button-voted" : "vote-button-idle"}
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {optimisticVoted ? (
        <RiArrowUpFill aria-hidden="true" className="size-4" />
      ) : (
        <RiArrowUpLine aria-hidden="true" className="size-4" />
      )}
      <span className="tabular-nums">{optimisticCount}</span>
    </button>
  );
}
