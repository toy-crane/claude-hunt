"use client";

import { RiArrowUpFill, RiArrowUpLine } from "@remixicon/react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
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
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button
        aria-label={ARIA_LABEL}
        asChild
        className="gap-1.5"
        data-testid="vote-button-signin"
        size="sm"
        variant="outline"
      >
        <Link href="/login">
          <RiArrowUpLine aria-hidden="true" className="size-3.5" />
          {voteCount}
        </Link>
      </Button>
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
