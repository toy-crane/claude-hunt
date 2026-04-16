"use client";

import { RiArrowUpFill, RiArrowUpLine } from "@remixicon/react";
import { Button } from "@shared/ui/button";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleVote } from "../api/actions";

const ARIA_LABEL = "추천하기";

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
        className="inline-flex items-center gap-1.5 px-2 text-muted-foreground text-xs"
        data-testid="vote-owner-count"
      >
        <RiArrowUpLine aria-hidden="true" className="size-3.5" />
        <span className="sr-only">추천 수</span>
        <span className="tabular-nums">{voteCount}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        aria-label={ARIA_LABEL}
        asChild
        data-testid="vote-button-signin"
        size="sm"
        variant="outline"
      >
        <Link href="/login">
          <RiArrowUpLine aria-hidden="true" />
          <span className="tabular-nums">{voteCount}</span>
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
    <Button
      aria-label={ARIA_LABEL}
      aria-pressed={optimisticVoted}
      data-testid={optimisticVoted ? "vote-button-voted" : "vote-button-idle"}
      disabled={isPending}
      onClick={handleClick}
      size="sm"
      type="button"
      variant={optimisticVoted ? "default" : "outline"}
    >
      {optimisticVoted ? (
        <RiArrowUpFill aria-hidden="true" />
      ) : (
        <RiArrowUpLine aria-hidden="true" />
      )}
      <span className="tabular-nums">{optimisticCount}</span>
    </Button>
  );
}
